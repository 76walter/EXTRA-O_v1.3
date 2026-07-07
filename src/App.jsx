import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Globe, 
  MessageSquare, 
  LayoutDashboard, 
  Zap, 
  Smartphone, 
  FileText, 
  Search, 
  Copy, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  PhoneCall, 
  XSquare,
  TrendingUp,
  TrendingDown,
  User,
  Send,
  Phone,
  Settings,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { useStore } from './store';
import { useAuth } from './contexts/AuthContext';
import { apiFetch } from './services/authService';
import Modal from './components/Modal';
import Sidebar from './components/Sidebar';
import TemplateModal from './components/TemplateModal';
import SheetModal from './components/SheetModal';
import PasteNumbersModal from './components/PasteNumbersModal';
import TokenModal from './components/TokenModal';
import WhatsAppPanel from './components/WhatsAppPanel';
import DashboardPanel from './components/DashboardPanel';
import MacroTimPanel from './components/MacroTimPanel';
import ExtractionPanel from './components/ExtractionPanel';
import WhatsAppToolbar from './components/WhatsAppToolbar';
import SettingsPanel from './components/SettingsPanel';
import ToastContainer, { showToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import CadastroUsuariosPage from './pages/CadastroUsuariosPage';
import ProtectedRoute from './components/ProtectedRoute';
import { DEFAULT_WA_TEMPLATES, formatPhone, buildTemplatePreview, extractContactsFromRows, normalizePhone, copyTextToClipboard, parsePhoneNumbers } from './utils';

function AppMain() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('extraction');

  // Sincroniza a aba ativa com a URL e protege contra acessos manuais indevidos
  useEffect(() => {
    const path = location.pathname;
    
    const checkAccess = (allowed) => {
      return user && allowed.includes(user.perfil);
    };

    if (path === '/' || path === '/extraction') {
      setActiveTab('extraction');
    } else if (path === '/whatsapp') {
      setActiveTab('whatsapp');
    } else if (path === '/dashboard') {
      if (checkAccess(['ADMIN', 'GERENTE', 'SUPERVISOR'])) {
        setActiveTab('dashboard');
      } else {
        navigate('/extraction', { replace: true });
      }
    } else if (path === '/timvendas') {
      if (checkAccess(['ADMIN', 'GERENTE', 'SUPERVISOR'])) {
        setActiveTab('timvendas');
      } else {
        navigate('/extraction', { replace: true });
      }
    } else if (path === '/settings') {
      if (checkAccess(['ADMIN'])) {
        setActiveTab('settings');
      } else {
        navigate('/extraction', { replace: true });
      }
    } else if (path === '/usuarios') {
      if (checkAccess(['ADMIN'])) {
        setActiveTab('usuarios');
      } else {
        navigate('/extraction', { replace: true });
      }
    } else {
      navigate('/extraction', { replace: true });
    }
  }, [location, user, navigate]);
  const { 
    status, setStatus,
    bridgeHealth, setBridgeHealth,
    logs, setLogs,
    vendasHoje, setVendasHoje,
    cancelamentosHoje, setCancelamentosHoje,
    vendedor, setVendedor,
    extractedData, setExtractedData,
    initSocket, cleanupSocket, checkDailyReset
  } = useStore();

  useEffect(() => {
    checkDailyReset();
    initSocket(user);
    return () => cleanupSocket();
  }, [user]);

  // Dashboard State
  const [filterQuery, setFilterQuery] = useState('');
  const filteredLogs = useMemo(() => {
    if (!filterQuery) return logs;
    const q = filterQuery.toLowerCase();
    return logs.filter(log => 
      (log.cliente && log.cliente.toLowerCase().includes(q)) ||
      (log.cpf && log.cpf.includes(q)) ||
      (log.consultor && log.consultor.toLowerCase().includes(q)) ||
      (log.statusCanc && log.statusCanc.toLowerCase().includes(q))
    );
  }, [logs, filterQuery]);

  
  
  // Extraction State
  const [selectedMask, setSelectedMask] = useState('');
  
  const [masks, setMasks] = useState({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaskName, setEditingMaskName] = useState('');
  const [maskForm, setMaskForm] = useState({ name: '', template: '' });

  const fetchMasks = async () => {
    try {
      const response = await apiFetch('/masks');
      if (response.ok) {
        const data = await response.json();
        setMasks(data);
        if (!selectedMask && Object.keys(data).length > 0) {
          setSelectedMask(Object.keys(data)[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar máscaras:', e);
    }
  };

  useEffect(() => {
    fetchMasks();
  }, []);

  // WhatsApp State
  const [templates, setTemplates] = useLocalStorageState('wa_templates', DEFAULT_WA_TEMPLATES);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateEditMode, setTemplateEditMode] = useState('add'); // 'add' ou 'edit'
  const [tempTemplateName, setTempTemplateName] = useState('');
  const [tempTemplateContent, setTempTemplateContent] = useState('');

  const [waUF, setWaUF] = useState('TODOS');
  const [waTemplate, setWaTemplate] = useState('📱 Qualidade Padrão');
  const [waMessage, setWaMessage] = useState('');
  const [dialList, setDialList] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState(new Set());
  const [sendList, setSendList] = useState([]);
  const [isUfOpen, setIsUfOpen] = useState(false);
  const [currentDialIndex, setCurrentDialIndex] = useState(0); 
  const [currentSendIndex, setCurrentSendIndex] = useState(0); 
  const [rawRows, setRawRows] = useState([]); 
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteType, setPasteType] = useState('dial');
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef(null);

  // Token Modal State
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isInjectingToken, setIsInjectingToken] = useState(false);

  // Estados/Refs para controle de Disparo em Lote
  const [dispatchState, setDispatchState] = useState({
    isActive: false,
    isPaused: false,
    progress: { sent: 0, total: 0 }
  });
  const [dispatchDelay, setDispatchDelay] = useState(240); // delay em segundos, padrão 4 minutos (240s)

  const dispatchActiveRef = useRef(false);
  const dispatchPausedRef = useRef(false);


  // Planilhas Management State
  const [waSheets, setWaSheets] = useLocalStorageState('wa_sheets', { GERAL: '' });
  const [activeSheet, setActiveSheet] = useState(Object.keys(waSheets)[0] || 'GERAL');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetModalActive, setSheetModalActive] = useState('');
  const [sheetFormName, setSheetFormName] = useState('');
  const [sheetFormLink, setSheetFormLink] = useState('');

  // Efeito para carregar a mensagem inicial baseada nos templates
  useEffect(() => {
    if (templates[waTemplate]) {
      setWaMessage(templates[waTemplate]);
    }
  }, [waTemplate, templates]);

  // Estados principais com persistência local
  
  
  
  

  // ===== HEALTH CHECK DA PONTE =====
  
  

  const handleSaveMask = async () => {
    if (!maskForm.name || !maskForm.template) {
      showToast("Por favor, preencha o nome e o modelo da máscara.", "error");
      return;
    }

    try {
      const response = await apiFetch('/masks', {
        method: 'POST',
        body: JSON.stringify(maskForm),
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        await fetchMasks();
        setIsModalOpen(false);
        setSelectedMask(maskForm.name);
        setMaskForm({ name: '', template: '' });
        showToast("Máscara salva com sucesso!", "success");
      }
    } catch (error) {
      showToast("Erro ao salvar máscara.", "error");
    }
  };

  const handleDeleteMask = async () => {
    if (!selectedMask) return;
    
    try {
      const nameToRemove = selectedMask;
      const response = await apiFetch(`/masks/${encodeURIComponent(nameToRemove)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        await fetchMasks();
        setStatus({ text: `🗑️ Máscara "${nameToRemove}" excluída!`, active: true });
        showToast(`Máscara "${nameToRemove}" excluída!`, "success");
      }
    } catch (error) {
      showToast("Erro ao excluir máscara.", "error");
    }
  };

  const openAddModal = () => {
    setEditingMaskName('');
    setMaskForm({ name: '', template: '' });
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedMask) return;
    setEditingMaskName(selectedMask);
    setMaskForm({ name: selectedMask, template: masks[selectedMask] || '' });
    setIsModalOpen(true);
  };

  const previewContent = useMemo(() => {
    const template = masks[selectedMask] || 'Máscara não definida.';
    const sourceData = Array.isArray(extractedData)
      ? extractedData[0] || {}
      : (typeof extractedData === 'object' && extractedData !== null ? extractedData : {});
    return buildTemplatePreview(template, sourceData, vendedor);
  }, [masks, selectedMask, extractedData, vendedor]);

  // --- MANUAL UPDATE TIM VENDAS ---
  // Atualização automática removida a pedido do usuário. A extração ocorrerá apenas ao clicar no botão.

  const handleExtract = async (source = 'vtme') => {
    let endpoint = '/extract';
    if (source === 'tim') endpoint = '/extract-tim';
    else if (source === 'vtme_macro') endpoint = '/extract-vtme-macro';

    const isLongExtraction = source === 'tim' || source === 'vtme_macro';
    const timeoutMs = isLongExtraction ? 300000 : 30000; // 5min para TIM/VTME Macro, 30s para VTME Único
    setStatus({ text: `🤖 Extraindo ${source === 'vtme_macro' ? 'VTME (Macro)' : source.toUpperCase()}... Por favor, aguarde.`, active: true });
    
    try {
      const response = await apiFetch(endpoint, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        let errorMsg = 'Ligue a Ponte (bridge.js)';
        try {
          const errData = await response.json();
          if (errData && errData.error) errorMsg = errData.error;
          else if (errData && errData.message) errorMsg = errData.message;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const dataExtraida = await response.json();
      if (dataExtraida && dataExtraida.success === false) {
        throw new Error(dataExtraida.message || dataExtraida.error || 'Erro na extração');
      }
      
      // Se for Tim, recebemos uma lista (Array) de registros
      if (source === 'tim' && Array.isArray(dataExtraida.data)) {
         setExtractedData(prev => {
             const novalista = Array.isArray(prev) ? [...prev] : [];
             let novosCount = 0;
             
             dataExtraida.data.forEach(novoItem => {
                 const index = novalista.findIndex(old => old.ordem === novoItem.ordem);
                 // Se o pedido já existe na tela, atualiza só os dados se algo mudou
                 if (index !== -1) {
                     novalista[index] = { ...novalista[index], ...novoItem };
                 } else {
                     // Pedido totalmente novo que o robô achou
                     novalista.push({ ...novoItem, launched: false });
                     novosCount++;
                 }
             });
             
             setStatus({ text: `⚡ Tim Vendas: ${novosCount} novos pedidos identificados`, active: true });
             return novalista;
         });
         return;
      }

      // Se for VTME Macro, mescla os dados de Biometria, Consultor e Supervisor com a lista de TIM Vendas atual
      if (source === 'vtme_macro' && dataExtraida.success && Array.isArray(dataExtraida.data)) {
         setExtractedData(prev => {
             const novalista = Array.isArray(prev) ? [...prev] : [];
             let atualizadosCount = 0;
             
             dataExtraida.data.forEach(vtmeItem => {
                 const cleanVtmeCPF = vtmeItem.cpf && vtmeItem.cpf !== '--' ? vtmeItem.cpf.replace(/\D/g, '') : '';
                 
                 // Busca registro correspondente na lista pelo CPF ou Nome
                 const index = novalista.findIndex(old => {
                     const cleanOldCPF = old.cpf && old.cpf !== '--' ? old.cpf.replace(/\D/g, '') : '';
                     if (cleanOldCPF && cleanVtmeCPF && cleanOldCPF === cleanVtmeCPF) {
                         return true;
                     }
                     if (old.nome && vtmeItem.cliente && old.nome.trim().toLowerCase() === vtmeItem.cliente.trim().toLowerCase()) {
                         return true;
                     }
                     return false;
                 });

                 if (index !== -1) {
                     const oldItem = novalista[index];
                     novalista[index] = {
                         ...oldItem,
                         bio: vtmeItem.bio || oldItem.bio || '--',
                         consultor: vtmeItem.consultor || oldItem.consultor || '--',
                         supervisor: vtmeItem.supervisor || oldItem.supervisor || '--'
                     };
                     atualizadosCount++;
                 }
             });
             
             setStatus({ text: `⚡ VTME: ${atualizadosCount} pedidos atualizados com Biometria/Consultor/Supervisor`, active: true });
             return novalista;
         });
         return;
      }

      // Padronização para VTME (Registro único)
      const normalizedData = source === 'vtme' ? {
        ...dataExtraida,
        nome: dataExtraida.nome_cliente,
        cpf: dataExtraida.cpf_cliente,
        ordem: dataExtraida.ordem || '--',
        datainst: dataExtraida.datainst || '--',
        statusinst: dataExtraida.statusinst || '--'
      } : {
        ...dataExtraida.data,
        nome_cliente: dataExtraida.data.nome,
        cpf_cliente: dataExtraida.data.cpf,
        plano: dataExtraida.data.status,
        extractedFrom: 'tim'
      };

      setExtractedData(normalizedData);
      if (normalizedData.consultora || normalizedData.consultor) {
        setVendedor(normalizedData.consultora || normalizedData.consultor);
      }
      
      setStatus({ text: `✅ Extração Concluída: ${normalizedData.nome_cliente || normalizedData.nome}`, active: true });

      // --- LOGICA DASHBOARD (EXCLUSIVA PARA VTME / VENDAS) ---
      if (source === 'vtme') {
        const isCancMask = selectedMask.includes('🚫 Cancelamento Operação');
        const clientName = normalizedData.nome_cliente || 'NOME NÃO ENCONTRADO';
        
        setLogs(prev => {
          const existingIndex = prev.findIndex(log => log.cliente === clientName);

          if (existingIndex !== -1) {
             const updated = [...prev];
             if (isCancMask && updated[existingIndex].statusCanc === '⏳ PENDENTE') {
                 updated[existingIndex] = { ...updated[existingIndex], statusCanc: '✅ SOLICITADO' };
                 setTimeout(() => setCancelamentosHoje(c => c + 1), 0);
             }
             if (normalizedData.bio && (!updated[existingIndex].bio || updated[existingIndex].bio === '--')) {
                 updated[existingIndex] = { ...updated[existingIndex], bio: normalizedData.bio };
             }
             if (normalizedData.cpf && !updated[existingIndex].cpf) {
                 updated[existingIndex] = { ...updated[existingIndex], cpf: normalizedData.cpf };
             }
             return updated;
          } else {
             const newLog = {
               id: Date.now(),
               data: new Date().toLocaleDateString('pt-BR'),
               hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
               cliente: clientName,
               cpf: normalizedData.cpf || '',
               uf: normalizedData.uf || '--',
               bio: normalizedData.bio || '--',
               consultor: normalizedData.consultora || normalizedData.consultor || vendedor || 'Consultor',
               supervisor: normalizedData.supervisor || 'Supervisor',
               statusCanc: isCancMask ? '✅ SOLICITADO' : '⏳ PENDENTE'
             };
             
             setTimeout(() => {
                setVendasHoje(v => v + 1);
                if (isCancMask) setCancelamentosHoje(c => c + 1);
             }, 0);

             return [newLog, ...prev];
          }
        });
      }
    } catch (error) {
      console.error('Erro na extração:', error);
      const msg = error.message === 'Ligue a Ponte (bridge.js)' || error.message.includes('fetch') || error.message === 'Failed to fetch'
        ? 'Erro: Ligue a Ponte (bridge.js)' 
        : `Falha: ${error.message}`;
      setStatus({ text: `❌ ${msg}`, active: true });
    }
  };

  const copyToClipboard = async (content) => {
    try {
      await copyTextToClipboard(content);
      showToast('Máscara preenchida copiada com sucesso!', 'success');
    } catch (error) {
      showToast('Falha ao copiar a máscara.', 'error');
    }
  };

  const handleUFClick = (uf) => {
    setWaUF(uf);
    setIsUfOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus({ text: `📂 Lendo arquivo local para ${waUF}...`, active: true });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const { contacts, nextIndex } = extractContactsFromRows(rows, waUF);

        if (contacts.length === 0) {
          showToast('Não foram encontrados contatos válidos na planilha.', 'error');
          return;
        }

        setRawRows(rows);
        setCurrentDialIndex(nextIndex);
        setCurrentSendIndex(nextIndex);
        setDialList(contacts);
        setSendList(contacts);
        setStatus({ text: `✅ ${contacts.length} contatos carregados para ${waUF}`, active: true });
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        showToast('Erro ao ler o arquivo Excel.', 'error');
        setStatus({ text: '❌ Falha ao processar a planilha', active: true });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInjectTimToken = async (token) => {
    try {
      setIsInjectingToken(true);
      setStatus({ text: '🔐 Injetando Token RSA no TIM Vendas...', active: true });
      const response = await apiFetch('/login-tim', {
        method: 'POST',
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(20000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao injetar token');
      }

      setStatus({ text: '✅ Login TIM Vendas realizado com sucesso!', active: true });
      showToast('Token injetado e login efetuado com sucesso!', 'success');
      setIsTokenModalOpen(false);
    } catch (error) {
      console.error('Erro no login TIM:', error);
      setStatus({ text: `❌ Falha no login: ${error.message}`, active: true });
      showToast(error.message, 'error');
    } finally {
      setIsInjectingToken(false);
    }
  };

  const processBatch = (rows, startIdx, uf, targetList) => {
    const { contacts, nextIndex } = extractContactsFromRows(rows, uf, 20, startIdx);

    if (!contacts.length) {
      showToast(`Nenhum contato encontrado para ${uf} nas colunas.`, 'error');
      setStatus({ text: '❌ Nenhum contato encontrado', active: true });
      return;
    }

    if (targetList === 'dial') {
      setDialList(prev => [...prev, ...contacts]);
      setCurrentDialIndex(nextIndex);
    } else {
      setSendList(prev => [...prev, ...contacts]);
      setCurrentSendIndex(nextIndex);
    }

    setStatus({ text: `✅ Lote de ${contacts.length} contatos extraído e enviado para ${targetList === 'dial' ? 'Fila de Ligar' : 'Fila de Disparo'}!`, active: true });
  };

  const handleCallClick = async (number) => {
    setStatus({ text: `📞 Discando para ${formatPhone(number)}...`, active: true });
    toggleCalled(number); // Marca como realizado azul
    
    try {
      const response = await apiFetch(`/dial-3c?number=${number}`, { signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      
      if (data.status === '3C_OPENED') {
        showToast('Abrimos o 3C Plus para você. Por favor, realize o login e tente discar novamente.', 'info');
      } else if (data.success) {
        setStatus({ text: `✅ Ligação iniciada para ${formatPhone(number)}`, active: true });
      }
    } catch (error) {
      console.error('Erro na discagem:', error);
      setStatus({ text: '❌ Falha na comunicação com 3C Plus', active: true });
    }
  };

  const handleSendWhatsApp = async (number, message) => {
    const cleanNum = normalizePhone(number);
    if (!cleanNum || cleanNum.length < 10 || cleanNum.length > 13) {
      console.warn(`Número suspeito: ${cleanNum}`);
      setStatus({ text: `❌ Número inválido: ${number}`, active: true });
      return false;
    }

    setStatus({ text: `✉️ Enviando para ${formatPhone(cleanNum)}...`, active: true });

    try {
      const response = await apiFetch(`/send-whatsapp?number=${cleanNum}&message=${encodeURIComponent(message)}`, { signal: AbortSignal.timeout(45000) });
      const data = await response.json();

      if (data.success) {
        setStatus({ text: `✅ Mensagem enviada para ${formatPhone(cleanNum)}`, active: true });
        return true;
      }

      if (data.status === 'INVALID') {
        setStatus({ text: `❌ Número Inválido: ${formatPhone(cleanNum)}`, active: true });
        return false;
      }

      setStatus({ text: '❌ Falha no envio do WhatsApp', active: true });
      return false;
    } catch (error) {
      console.error('Erro no envio WA:', error);
      setStatus({ text: '❌ Falha ao enviar WhatsApp', active: true });
      return false;
    }
  };

  // WhatsApp Engine SSE Listener
  useEffect(() => {
    const token = localStorage.getItem('vtme_token');
    const sse = new EventSource(`http://localhost:3001/api/whatsapp/stream?token=${encodeURIComponent(token)}`);
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setDispatchState({
        isActive: data.status === 'RUNNING' || data.status === 'PAUSED',
        isPaused: data.status === 'PAUSED',
        progress: data.progress
      });
      if (data.queue && data.queue.length > 0) {
        setSendList(data.queue);
      }
    };
    return () => sse.close();
  }, []);

  const pauseBatchDispatch = async () => {
        await apiFetch('/api/whatsapp/pause', { method: 'POST' });
    setStatus({ text: '⏸️ Disparo em lote PAUSADO pelo usuário.', active: true });
  };

  const resumeBatchDispatch = async () => {
        await apiFetch('/api/whatsapp/resume', { method: 'POST' });
    setStatus({ text: '🚀 Retomando disparos...', active: true });
  };

  const stopBatchDispatch = async () => {
        await apiFetch('/api/whatsapp/cancel', { method: 'POST' });
    setStatus({ text: '🛑 Disparo em lote PARADO pelo usuário.', active: true });
  };

  const startBatchDispatch = async () => {
    if (dispatchState.isActive) {
      if (dispatchState.isPaused) {
        resumeBatchDispatch();
        return;
      }
      return;
    }

    const pendingItems = sendList.filter(item => !item.sent);
    if (pendingItems.length === 0) {
      showToast("Não há números pendentes de envio na lista!", "error");
      return;
    }

    if (!waMessage.trim()) {
      showToast("Selecione um modelo ou escreva uma mensagem primeiro!", "error");
      return;
    }

    setStatus({ text: `🚀 Iniciando disparo para ${pendingItems.length} contatos...`, active: true });

    await apiFetch('/api/whatsapp/start', {
      method: 'POST',
      body: JSON.stringify({
        contacts: sendList,
        message: waMessage,
        minDelay: Math.max(2000, (dispatchDelay * 1000) - 5000),
        maxDelay: (dispatchDelay * 1000) + 5000
      })
    });
  };

  const loadNextDialBatch = () => {
    if (rawRows.length === 0) {
      showToast("Carregue uma planilha primeiro!", "error");
      return;
    }
    processBatch(rawRows, currentDialIndex, waUF, 'dial');
  };

  const loadNextSendBatch = () => {
    if (rawRows.length === 0) {
      showToast("Carregue uma planilha primeiro!", "error");
      return;
    }
    processBatch(rawRows, currentSendIndex, waUF, 'send');
  };

  const clearDialList = () => {
    console.log("Limpar Fila Ligar Clicado");
    setDialList([]);
    setCalledNumbers(new Set());
    setStatus({ text: '🗑️ Fila de ligação esvaziada!', active: true });
  };

  const clearSendList = () => {
    console.log("Limpar Fila Disparo Clicado");
    setSendList([]);
    setStatus({ text: '🗑️ Fila de disparos esvaziada!', active: true });
  };

  const copyList = async (list) => {
    if (!list || list.length === 0) {
      showToast('A lista está vazia!', 'error');
      return;
    }

    const text = list.map(i => i.number).join('\n');

    try {
      await copyTextToClipboard(text);
      showToast(`${list.length} números copiados com sucesso!`, 'success');
    } catch (err) {
      console.error('Falha ao copiar:', err);
      showToast('Falha ao copiar a lista.', 'error');
    }
  };

  const saveTemplates = (newTemplates) => {
    setTemplates(newTemplates);
  };

  const handleAddTemplate = () => {
    setTemplateEditMode('add');
    setTempTemplateName('');
    setTempTemplateContent('');
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = () => {
    if (!waTemplate) return;
    setTemplateEditMode('edit');
    setTempTemplateName(waTemplate);
    setTempTemplateContent(templates[waTemplate]);
    setIsTemplateModalOpen(true);
  };

  // --- Funções de Gestão de Planilhas ---
  const saveSheets = (newSheets) => {
    setWaSheets(newSheets);
  };

  const handleOpenSheetModal = () => {
    const defaultSheet = activeSheet || Object.keys(waSheets)[0] || '';
    setSheetModalActive(defaultSheet);
    if (defaultSheet) {
      setSheetFormName(defaultSheet);
      setSheetFormLink(waSheets[defaultSheet] || '');
    } else {
      setSheetFormName('');
      setSheetFormLink('');
    }
    setIsSheetModalOpen(true);
  };
  
  const handleSaveSheet = () => {
    if (!sheetFormName.trim()) { showToast("Nome da planilha é obrigatório", "error"); return; }
    const newSheets = { ...waSheets };
    if (sheetModalActive && sheetModalActive !== sheetFormName) {
      delete newSheets[sheetModalActive];
    }
    newSheets[sheetFormName] = sheetFormLink;
    saveSheets(newSheets);
    setActiveSheet(sheetFormName);
    setSheetModalActive(sheetFormName);
  };

  const handleDeleteSheet = () => {
    if (Object.keys(waSheets).length <= 1) { showToast("Mantenha ao menos uma planilha listada.", "error"); return; }
    const newSheets = { ...waSheets };
    delete newSheets[sheetModalActive];
    saveSheets(newSheets);
    const firstLeft = Object.keys(newSheets)[0];
    setActiveSheet(firstLeft);
    setSheetModalActive(firstLeft);
    setSheetFormName(firstLeft);
    setSheetFormLink(newSheets[firstLeft]);
  };
  
  const handleNewSheet = () => {
    setSheetModalActive('');
    setSheetFormName('');
    setSheetFormLink('');
  };

  const handleDeleteTemplate = () => {
    if (Object.keys(templates).length <= 1) {
      showToast("Você deve ter pelo menos um modelo de mensagem.", "error");
      return;
    }
    const nameToRemove = waTemplate;
    const newTemplates = { ...templates };
    delete newTemplates[nameToRemove];
    const firstLeft = Object.keys(newTemplates)[0];
    saveTemplates(newTemplates);
    setWaTemplate(firstLeft);
    setWaMessage(newTemplates[firstLeft]);
    setStatus({ text: `🗑️ Modelo "${nameToRemove}" excluído!`, active: true });
  };

  const handleSaveTemplate = () => {
    if (!tempTemplateName.trim()) {
      showToast("Digite um nome para o modelo.", "error");
      return;
    }
    const newTemplates = { ...templates };
    
    if (templateEditMode === 'edit' && tempTemplateName !== waTemplate) {
      delete newTemplates[waTemplate];
    }
    
    newTemplates[tempTemplateName] = tempTemplateContent;
    saveTemplates(newTemplates);
    setWaTemplate(tempTemplateName);
    setWaMessage(tempTemplateContent);
    setIsTemplateModalOpen(false);
  };

  const addManualNumber = (listType) => {
    setPasteType(listType);
    setPasteContent('');
    setIsPasteModalOpen(true);
  };

  const handleProcessPaste = () => {
    const newItems = parsePhoneNumbers(pasteContent);

    if (newItems.length > 0) {
      if (pasteType === 'dial') setDialList(prev => [...prev, ...newItems]);
      else setSendList(prev => [...prev, ...newItems]);
      setStatus({ text: `✅ ${newItems.length} números adicionados manualmente!`, active: true });
    }

    setIsPasteModalOpen(false);
    setPasteContent('');
  };

  const toggleCalled = (number) => {
    setCalledNumbers(prev => {
      const next = new Set(prev);
      next.add(number); // Agora só adiciona, nunca remove
      return next;
    });
  };

  const handleLaunchSpreadsheet = async () => {
    setStatus({ text: '📊 Lançando na Planilha...', active: true });
    try {
      const res = await apiFetch('/launch-spreadsheet', { signal: AbortSignal.timeout(60000) });
      if (res.ok) {
        setStatus({ text: '✅ Dados Enviados com Sucesso!', active: true });
      } else {
        throw new Error('Erro no lançamento da planilha');
      }
    } catch (error) {
      console.error(error);
      setStatus({ text: '❌ Erro ao Lançar Planilha', active: true });
    }
  };

  const handleLaunchMacro = async (pendentes) => {
    setStatus({ text: '📊 Lançando Macro...', active: true });
    try {
      const response = await apiFetch('/macro-tim', {
        method: 'POST',
        body: JSON.stringify({ data: pendentes }),
        signal: AbortSignal.timeout(60000)
      });
      
      const resData = await response.json();
      
      const updateLaunchedState = () => {
        const launchedKeys = new Set(pendentes.map(item => {
          return (item.ordem && item.ordem !== '--') ? item.ordem : (item.id || item.nome);
        }));
        setExtractedData(prev => prev.map(item => {
          const key = (item.ordem && item.ordem !== '--') ? item.ordem : (item.id || item.nome);
          if (launchedKeys.has(key)) {
            return { ...item, launched: true };
          }
          return item;
        }));
      };

      if (response.ok && resData.count === 0) {
        showToast('Não foram adicionados dados novos na tela para serem lançados na Macro acompanhamento.xlsm', 'info');
        updateLaunchedState();
        setStatus({ text: '✅ Todos os dados já constam lançados', active: true });
        return;
      }

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao lançar');
      }

      updateLaunchedState();
      setStatus({ text: `✅ ${resData.count} novos lançados com Sucesso!`, active: true });
    } catch (error) {
      console.error(error);
      setStatus({ text: '❌ Erro ao Lançar', active: true });
    }
  };

  return (
    <div className="app-container">
      <Sidebar status={status} setStatus={setStatus} bridgeHealth={bridgeHealth} />

      {/* Main Content */}
      <main className="main-content">
        <div className="tab-container">
          <div className="tab-header">
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                className={`tab-trigger ${activeTab === 'extraction' ? 'active' : ''}`}
                onClick={() => navigate('/extraction')}
              >
                <Zap size={16} /> Extração Inteligente
              </button>
              <button 
                className={`tab-trigger ${activeTab === 'whatsapp' ? 'active' : ''}`}
                onClick={() => navigate('/whatsapp')}
              >
                <MessageSquare size={16} /> WhatsApp Qualidade
              </button>
              {user && ['ADMIN', 'GERENTE', 'SUPERVISOR'].includes(user.perfil) && (
                <button 
                  className={`tab-trigger ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => navigate('/dashboard')}
                >
                  <LayoutDashboard size={16} /> Dashboard Vendas Fibra
                </button>
              )}
              {user && ['ADMIN', 'GERENTE', 'SUPERVISOR'].includes(user.perfil) && (
                <button 
                  className={`tab-trigger ${activeTab === 'timvendas' ? 'active' : ''}`}
                  onClick={() => navigate('/timvendas')}
                >
                  <Zap size={16} /> Macro Tim Vendas
                </button>
              )}
              {user && user.perfil === 'ADMIN' && (
                <button 
                  className={`tab-trigger ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => navigate('/settings')}
                >
                  <Settings size={16} /> Configurações
                </button>
              )}
              {user && user.perfil === 'ADMIN' && (
                <button 
                  className={`tab-trigger ${activeTab === 'usuarios' ? 'active' : ''}`}
                  onClick={() => navigate('/usuarios')}
                >
                  <Users size={16} /> Usuários e Logs
                </button>
              )}
            </div>

            {/* Título Contextual do Dashboard (alinhado com as abas) */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingRight: '20px' }}>
                <span className="page-title" style={{ color: 'var(--primary)', margin: 0 }}>📊 Monitoramento Vendas</span>
              </div>
            )}
          </div>

          {/* Barra de Ferramentas Secundária (Exclusiva WhatsApp Qualidade) */}
          {activeTab === 'whatsapp' && (
            <WhatsAppToolbar
              activeSheet={activeSheet}
              waSheets={waSheets}
              setActiveSheet={setActiveSheet}
              handleOpenSheetModal={handleOpenSheetModal}
              isUfOpen={isUfOpen}
              waUF={waUF}
              setIsUfOpen={setIsUfOpen}
              handleUFClick={handleUFClick}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              dialListLength={dialList.length}
            />
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'extraction' && (
              <motion.div
                key="extraction"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <ExtractionPanel
                  masks={masks}
                  selectedMask={selectedMask}
                  setSelectedMask={setSelectedMask}
                  extractedData={extractedData}
                  previewContent={previewContent}
                  handleExtract={handleExtract}
                  handleLaunchSpreadsheet={handleLaunchSpreadsheet}
                  openAddModal={openAddModal}
                  openEditModal={openEditModal}
                  handleDeleteMask={handleDeleteMask}
                  copyToClipboard={copyToClipboard}
                  isModalOpen={isModalOpen}
                  editingMaskName={editingMaskName}
                  maskForm={maskForm}
                  setMaskForm={setMaskForm}
                  onCloseMaskModal={() => setIsModalOpen(false)}
                  onSaveMask={handleSaveMask}
                />
              </motion.div>
            )}

            {activeTab === 'whatsapp' && (
              <motion.div
                key="whatsapp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <WhatsAppPanel
                  templates={templates}
                  waTemplate={waTemplate}
                  waMessage={waMessage}
                  setWaTemplate={setWaTemplate}
                  setWaMessage={setWaMessage}
                  handleAddTemplate={handleAddTemplate}
                  handleEditTemplate={handleEditTemplate}
                  handleDeleteTemplate={handleDeleteTemplate}
                  dialList={dialList}
                  calledNumbers={calledNumbers}
                  sendList={sendList}
                  handleCallClick={handleCallClick}
                  handleSendWhatsApp={handleSendWhatsApp}
                  startBatchDispatch={startBatchDispatch}
                  pauseBatchDispatch={pauseBatchDispatch}
                  stopBatchDispatch={stopBatchDispatch}
                  dispatchState={dispatchState}
                  dispatchDelay={dispatchDelay}
                  setDispatchDelay={setDispatchDelay}
                  loadNextDialBatch={loadNextDialBatch}
                  loadNextSendBatch={loadNextSendBatch}
                  addManualNumber={addManualNumber}
                  copyList={copyList}
                  clearDialList={clearDialList}
                  clearSendList={clearSendList}
                  setSendList={setSendList}
                  formatPhone={formatPhone}
                />
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <DashboardPanel
                  filteredLogs={filteredLogs}
                  filterQuery={filterQuery}
                  setFilterQuery={setFilterQuery}
                  vendedor={vendedor}
                  vendasHoje={vendasHoje}
                  cancelamentosHoje={cancelamentosHoje}
                  bridgeHealth={bridgeHealth}
                />
              </motion.div>
            )}

            {activeTab === 'timvendas' && (
              <motion.div
                key="timvendas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <MacroTimPanel
                  extractedData={extractedData}
                  logs={logs}
                  handleExtract={handleExtract}
                  handleLaunchMacro={handleLaunchMacro}
                  setStatus={setStatus}
                  onOpenTokenModal={() => setIsTokenModalOpen(true)}
                />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <SettingsPanel setStatus={setStatus} />
              </motion.div>
            )}
            {activeTab === 'usuarios' && (
              <motion.div
                key="usuarios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-panel active"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <CadastroUsuariosPage />
              </motion.div>
            )}
          </AnimatePresence>

          <PasteNumbersModal
            isOpen={isPasteModalOpen}
            pasteType={pasteType}
            pasteContent={pasteContent}
            setPasteContent={setPasteContent}
            onClose={() => setIsPasteModalOpen(false)}
            onSave={handleProcessPaste}
          />

          <TemplateModal
            isOpen={isTemplateModalOpen}
            editMode={templateEditMode}
            templateName={tempTemplateName}
            templateContent={tempTemplateContent}
            setTemplateName={setTempTemplateName}
            setTemplateContent={setTempTemplateContent}
            onClose={() => setIsTemplateModalOpen(false)}
            onSave={handleSaveTemplate}
          />
          <SheetModal
            isOpen={isSheetModalOpen}
            sheetModalActive={sheetModalActive}
            sheetFormName={sheetFormName}
            sheetFormLink={sheetFormLink}
            onActiveChange={(value) => {
              setSheetModalActive(value);
              setSheetFormName(value);
              setSheetFormLink(waSheets[value] || '');
            }}
            onNameChange={setSheetFormName}
            onLinkChange={setSheetFormLink}
            onNewSheet={handleNewSheet}
            onDeleteSheet={handleDeleteSheet}
            onSaveSheet={handleSaveSheet}
            onClose={() => setIsSheetModalOpen(false)}
            sheets={waSheets}
          />

          <TokenModal 
            isOpen={isTokenModalOpen} 
            onClose={() => setIsTokenModalOpen(false)} 
            onSubmit={handleInjectTimToken} 
            isInjecting={isInjectingToken} 
          />

        </div>
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppMain />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
