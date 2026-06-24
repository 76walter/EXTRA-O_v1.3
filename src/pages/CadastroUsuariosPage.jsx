import React, { useState, useEffect } from 'react';
import { usuarioService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { 
    UserPlus, Edit, Trash2, Shield, Eye, RefreshCw, Key, 
    CheckCircle, XCircle, Search, Calendar, ShieldCheck, Database, HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function CadastroUsuariosPage() {
    const { user: currentUser } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('usuarios'); // 'usuarios' ou 'auditoria'
    const [usuarios, setUsuarios] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [logSearchTerm, setLogSearchTerm] = useState('');

    // Estados para os Modais
    const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    // Formulário do usuário
    const [userId, setUserId] = useState(null); // null para criar, número para editar
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [perfil, setPerfil] = useState('CONSULTOR');
    const [ativo, setAtivo] = useState(true);

    // Formulário do reset de senha
    const [resetUserId, setResetUserId] = useState(null);
    const [resetUserEmail, setResetUserEmail] = useState('');
    const [novaSenhaReset, setNovaSenhaReset] = useState('');

    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const data = await usuarioService.listar();
            setUsuarios(data);
        } catch (e) {
            showToast(e.message || 'Erro ao carregar usuários', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await usuarioService.listarLogs();
            setLogs(data);
        } catch (e) {
            showToast(e.message || 'Erro ao carregar logs de auditoria', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSubTab === 'usuarios') {
            fetchUsuarios();
        } else {
            fetchLogs();
        }
    }, [activeSubTab]);

    const handleOpenCreateModal = () => {
        setUserId(null);
        setNome('');
        setEmail('');
        setSenha('');
        setPerfil('CONSULTOR');
        setAtivo(true);
        setIsCreateEditModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setUserId(user.id);
        setNome(user.nome);
        setEmail(user.email);
        setSenha(''); // Não carrega senha
        setPerfil(user.perfil);
        setAtivo(user.ativo);
        setIsCreateEditModalOpen(true);
    };

    const handleOpenResetModal = (user) => {
        setResetUserId(user.id);
        setResetUserEmail(user.email);
        setNovaSenhaReset('');
        setIsResetModalOpen(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!nome.trim() || !email.trim() || !perfil) {
            showToast('Preencha os campos obrigatórios.', 'error');
            return;
        }

        try {
            if (userId === null) {
                // Criar
                if (!senha) {
                    showToast('Senha é obrigatória para novos usuários.', 'error');
                    return;
                }
                await usuarioService.criar(nome, email, senha, perfil);
                showToast('Usuário cadastrado com sucesso! Deverá trocar de senha no primeiro acesso.', 'success');
            } else {
                // Editar
                await usuarioService.atualizar(userId, nome, email, perfil, ativo);
                showToast('Usuário atualizado com sucesso!', 'success');
            }
            setIsCreateEditModalOpen(false);
            fetchUsuarios();
        } catch (error) {
            showToast(error.message || 'Erro ao salvar usuário', 'error');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!novaSenhaReset || novaSenhaReset.length < 6) {
            showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
            return;
        }

        try {
            await usuarioService.resetarSenha(resetUserId, novaSenhaReset);
            showToast(`Senha de ${resetUserEmail} redefinida com sucesso! Ele deverá trocar a senha no próximo acesso.`, 'success');
            setIsResetModalOpen(false);
        } catch (error) {
            showToast(error.message || 'Erro ao resetar senha', 'error');
        }
    };

    const handleToggleStatus = async (user) => {
        // Impede que o admin logado se desative
        if (Number(user.id) === Number(currentUser.id)) {
            showToast('Você não pode alterar seu próprio status!', 'error');
            return;
        }

        try {
            const novoStatus = !user.ativo;
            await usuarioService.alterarStatus(user.id, novoStatus);
            showToast(`Usuário ${user.email} está agora ${novoStatus ? 'ATIVO' : 'INATIVO'}.`, 'success');
            fetchUsuarios();
        } catch (error) {
            showToast(error.message || 'Erro ao alterar status', 'error');
        }
    };

    const handleDeleteUser = async (user) => {
        if (Number(user.id) === Number(currentUser.id)) {
            showToast('Você não pode excluir seu próprio usuário!', 'error');
            return;
        }

        const confirm = window.confirm(`Tem certeza de que deseja excluir permanentemente o usuário ${user.email}?`);
        if (!confirm) return;

        try {
            await usuarioService.excluir(user.id);
            showToast(`Usuário ${user.email} excluído permanentemente.`, 'success');
            fetchUsuarios();
        } catch (error) {
            showToast(error.message || 'Erro ao excluir usuário', 'error');
        }
    };

    // Filtros de busca
    const filteredUsuarios = usuarios.filter(u => 
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.perfil.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLogs = logs.filter(l => 
        l.nome_usuario.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.acao.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.tela.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.perfil.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.ip.includes(logSearchTerm)
    );

    const getProfileBadgeColor = (p) => {
        switch (p) {
            case 'ADMIN': return { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' };
            case 'GERENTE': return { bg: 'rgba(37, 99, 235, 0.15)', text: '#60A5FA', border: 'rgba(37, 99, 235, 0.3)' };
            case 'SUPERVISOR': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
            case 'CONSULTOR': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' };
            case 'CHURN': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' };
            default: return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94A3B8', border: 'rgba(100, 116, 139, 0.3)' };
        }
    };

    return (
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', color: '#E2E8F0' }}>
            
            {/* Header da Tela */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={24} style={{ color: 'var(--primary)' }} /> Controle de Usuários e Permissões
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '5px 0 0' }}>
                        Cadastre novos colaboradores, defina níveis de acesso e audite o uso do sistema.
                    </p>
                </div>

                {activeSubTab === 'usuarios' && (
                    <button
                        onClick={handleOpenCreateModal}
                        style={{
                            background: 'var(--primary)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        <UserPlus size={16} /> Novo Usuário
                    </button>
                )}
            </div>

            {/* Sub-abas de Navegação */}
            <div style={{
                display: 'flex',
                gap: '10px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '2px',
                marginTop: '10px'
            }}>
                <button
                    className={`tab-trigger ${activeSubTab === 'usuarios' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('usuarios')}
                    style={{
                        padding: '10px 20px',
                        background: 'none',
                        border: 'none',
                        color: activeSubTab === 'usuarios' ? 'var(--primary)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderBottom: activeSubTab === 'usuarios' ? '2px solid var(--primary)' : 'none',
                        marginBottom: '-3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <UserPlus size={16} /> Usuários
                </button>
                <button
                    className={`tab-trigger ${activeSubTab === 'auditoria' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('auditoria')}
                    style={{
                        padding: '10px 20px',
                        background: 'none',
                        border: 'none',
                        color: activeSubTab === 'auditoria' ? 'var(--primary)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderBottom: activeSubTab === 'auditoria' ? '2px solid var(--primary)' : 'none',
                        marginBottom: '-3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Database size={16} /> Logs de Auditoria
                </button>
            </div>

            {/* Conteúdo das Sub-abas */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeSubTab === 'usuarios' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                        
                        {/* Barra de Busca */}
                        <div style={{ position: 'relative', maxWidth: '350px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por nome, email ou perfil..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 36px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: '#FFFFFF',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Tabela de Usuários */}
                        <div style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                    Carregando dados dos colaboradores...
                                </div>
                            ) : filteredUsuarios.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                    Nenhum usuário cadastrado ou correspondente à busca.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8' }}>Nome</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8' }}>E-mail</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8' }}>Nível / Perfil</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>Primeiro Acesso</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsuarios.map((u) => {
                                            const badge = getProfileBadgeColor(u.perfil);
                                            const isSelf = Number(u.id) === Number(currentUser.id);
                                            return (
                                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="user-tr">
                                                    <td style={{ padding: '14px 20px', fontWeight: 500, color: '#FFFFFF' }}>
                                                        {u.nome} {isSelf && <span style={{ fontSize: '0.7rem', background: 'rgba(37,99,235,0.2)', color: '#60A5FA', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>(Você)</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#E2E8F0', fontFamily: 'monospace' }}>{u.email}</td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{
                                                            background: badge.bg,
                                                            color: badge.text,
                                                            border: `1px solid ${badge.border}`,
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700
                                                        }}>
                                                            {u.perfil}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        {u.trocar_senha ? (
                                                            <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>Pendente Troca</span>
                                                        ) : (
                                                            <span style={{ color: '#10B981', fontSize: '0.75rem' }}>Senha Alterada</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        <button
                                                            disabled={isSelf}
                                                            onClick={() => handleToggleStatus(u)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: isSelf ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                color: u.ativo ? '#10B981' : '#EF4444',
                                                                fontWeight: 600,
                                                                opacity: isSelf ? 0.6 : 1
                                                            }}
                                                        >
                                                            {u.ativo ? (
                                                                <><CheckCircle size={14} /> Ativo</>
                                                            ) : (
                                                                <><XCircle size={14} /> Inativo</>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                            <button
                                                                title="Editar dados"
                                                                onClick={() => handleOpenEditModal(u)}
                                                                style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#60A5FA', cursor: 'pointer' }}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                title="Resetar senha"
                                                                onClick={() => handleOpenResetModal(u)}
                                                                style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#F59E0B', cursor: 'pointer' }}
                                                            >
                                                                <Key size={14} />
                                                            </button>
                                                            <button
                                                                title="Excluir colaborador"
                                                                disabled={isSelf}
                                                                onClick={() => handleDeleteUser(u)}
                                                                style={{
                                                                    padding: '6px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    color: isSelf ? '#64748B' : '#EF4444',
                                                                    cursor: isSelf ? 'not-allowed' : 'pointer',
                                                                    opacity: isSelf ? 0.5 : 1
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                        {/* Barra de Busca de Logs */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar logs por ação, usuário, IP..."
                                    value={logSearchTerm}
                                    onChange={(e) => setLogSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 36px',
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: '#FFFFFF',
                                        fontSize: '0.85rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <button
                                onClick={fetchLogs}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#FFFFFF',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '10px 15px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RefreshCw size={14} /> Atualizar Logs
                            </button>
                        </div>

                        {/* Tabela de Logs */}
                        <div style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                    Buscando histórico de auditoria...
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                    Nenhum log de auditoria encontrado.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8' }}>Data/Hora</th>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8' }}>Colaborador</th>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8' }}>Perfil</th>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8' }}>Ação Executada</th>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8' }}>Origem/Tela</th>
                                            <th style={{ padding: '12px 15px', fontWeight: 600, color: '#94A3B8', fontFamily: 'monospace' }}>IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((l) => (
                                            <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }} className="user-tr">
                                                <td style={{ padding: '12px 15px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={12} /> {new Date(l.data_hora).toLocaleString('pt-BR')}
                                                </td>
                                                <td style={{ padding: '12px 15px', fontWeight: 600, color: '#FFFFFF' }}>{l.nome_usuario}</td>
                                                <td style={{ padding: '12px 15px' }}>
                                                    <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                                                        {l.perfil}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 15px', color: '#E2E8F0' }}>{l.acao}</td>
                                                <td style={{ padding: '12px 15px', color: 'var(--text-dim)' }}>{l.tela}</td>
                                                <td style={{ padding: '12px 15px', color: '#38BDF8', fontFamily: 'monospace' }}>{l.ip}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: CRIAR / EDITAR USUÁRIO */}
            <Modal
                isOpen={isCreateEditModalOpen}
                title={userId === null ? 'Cadastrar Novo Usuário' : 'Editar Dados do Usuário'}
                onClose={() => setIsCreateEditModalOpen(false)}
            >
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                    
                    {/* Nome */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: João da Silva"
                            style={{
                                padding: '10px 12px',
                                background: 'var(--bg-main, #0F172A)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>E-mail corporativo</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="joao@empresa.com"
                            style={{
                                padding: '10px 12px',
                                background: 'var(--bg-main, #0F172A)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {/* Senha - Apenas no cadastro */}
                    {userId === null && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Senha Inicial</label>
                            <input
                                type="password"
                                required
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                placeholder="Digite uma senha provisória"
                                style={{
                                    padding: '10px 12px',
                                    background: 'var(--bg-main, #0F172A)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: '#FFFFFF',
                                    fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    )}

                    {/* Perfil */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Nível de Permissão (Perfil)</label>
                        <select
                            value={perfil}
                            onChange={(e) => setPerfil(e.target.value)}
                            style={{
                                padding: '10px 12px',
                                background: 'var(--bg-main, #0F172A)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                        >
                            <option value="CONSULTOR">CONSULTOR (Extração, WhatsApp)</option>
                            <option value="CHURN">CHURN (Extração, WhatsApp)</option>
                            <option value="SUPERVISOR">SUPERVISOR (+ Dashboard, App TIM)</option>
                            <option value="GERENTE">GERENTE (+ Dashboard, App TIM)</option>
                            <option value="ADMIN">ADMINISTRADOR (Acesso Total)</option>
                        </select>
                    </div>

                    {/* Ativo - Apenas na Edição */}
                    {userId !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <input
                                type="checkbox"
                                id="ativo-chk"
                                checked={ativo}
                                onChange={(e) => setAtivo(e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="ativo-chk" style={{ fontSize: '0.85rem', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>Usuário Ativo</label>
                        </div>
                    )}

                    {/* Botoes de Salvar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        <button
                            type="button"
                            onClick={() => setIsCreateEditModalOpen(false)}
                            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            style={{ padding: '8px 20px', background: 'var(--primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Salvar Dados
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: RESETAR SENHA */}
            <Modal
                isOpen={isResetModalOpen}
                title="Resetar Senha do Usuário"
                onClose={() => setIsResetModalOpen(false)}
            >
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
                        Forçar redefinição de senha para: <strong style={{ color: '#FFFFFF' }}>{resetUserEmail}</strong>. 
                        O usuário será obrigado a criar uma nova senha no próximo acesso.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Nova Senha Temporária</label>
                        <input
                            type="password"
                            required
                            value={novaSenhaReset}
                            onChange={(e) => setNovaSenhaReset(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            style={{
                                padding: '10px 12px',
                                background: 'var(--bg-main, #0F172A)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        <button
                            type="button"
                            onClick={() => setIsResetModalOpen(false)}
                            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            style={{ padding: '8px 20px', background: '#F59E0B', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Redefinir Senha
                        </button>
                    </div>
                </form>
            </Modal>

            <style>{`
                .user-tr:hover {
                    background: rgba(255, 255, 255, 0.02) !important;
                }
            `}</style>
        </div>
    );
}
