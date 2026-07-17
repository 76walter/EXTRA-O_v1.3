import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  autoConnect: false,
});

export const useStore = create(
  persist(
    (set, get) => ({
      // --- Estado da Interface ---
      status: { text: '🔴 Sistema Inativo', active: false },
      bridgeHealth: { status: 'unknown', browser: false },
      isVtmePaused: false,
      
      // --- Dados do Robô ---
      logs: [],
      vendasHoje: 0,
      cancelamentosHoje: 0,
      vendedor: 'Aguardando...',
      extractedData: [],
      
      // --- Ações ---
      setStatus: (status) => set({ status }),
      setBridgeHealth: (health) => set({ bridgeHealth: health }),
      setLogs: (updater) => set((state) => ({ logs: typeof updater === 'function' ? updater(state.logs) : updater })),
      setExtractedData: (updater) => set((state) => ({ extractedData: typeof updater === 'function' ? updater(state.extractedData) : updater })),
      setVendasHoje: (updater) => set((state) => ({ vendasHoje: typeof updater === 'function' ? updater(state.vendasHoje) : updater })),
      setCancelamentosHoje: (updater) => set((state) => ({ cancelamentosHoje: typeof updater === 'function' ? updater(state.cancelamentosHoje) : updater })),
      setVendedor: (vendedor) => set({ vendedor }),

      updateTimData: (data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        set((state) => {
          const lista = Array.isArray(state.extractedData) ? [...state.extractedData] : [];
          let currentLogs = [...state.logs];
          let novos = 0;
          let logsUpdated = false;

          data.forEach(item => {
            // Sincronização INVERSA: Se o VTME já rodou antes e gerou logs no Dashboard, 
            // pega a biometria, consultor e supervisor de lá para popular o Macro Tim Vendas
            const cleanCPF = item.cpf && item.cpf !== '--' ? item.cpf.replace(/\D/g, '') : '';
            let existingLog = null;
            if (cleanCPF) {
                existingLog = currentLogs.find(l => l.cpf && l.cpf.replace(/\D/g, '') === cleanCPF);
            }
            if (!existingLog && item.nome && item.nome !== '--') {
                const searchName = item.nome.trim().toLowerCase();
                existingLog = currentLogs.find(l => l.cliente && l.cliente.trim().toLowerCase() === searchName);
            }

            if (existingLog) {
                if (existingLog.bio && existingLog.bio !== '--') item.bio = existingLog.bio;
                if (existingLog.consultor && existingLog.consultor !== 'Consultor' && existingLog.consultor !== 'Não Identificado') item.consultor = existingLog.consultor;
                if (existingLog.supervisor && existingLog.supervisor !== 'Supervisor' && existingLog.supervisor !== 'Não Identificado') item.supervisor = existingLog.supervisor;
            }

            const exists = lista.findIndex(old => old.ordem === item.ordem);
            if (exists !== -1) {
              lista[exists] = { ...lista[exists], ...item };
            } else {
              lista.push({ ...item, launched: false });
              novos++;
            }

            // Cruzamento de dados para o Dashboard (usando CPF)
            if (item.cpf && item.cpf !== '--') {
              const cleanCPF = item.cpf.replace(/\D/g, '');
              const logIndex = currentLogs.findIndex(l => l.cpf && l.cpf.replace(/\D/g, '') === cleanCPF);
              if (logIndex !== -1) {
                // Do TIM para o VTME
                currentLogs[logIndex].infraco = item.infraco || '--';
                currentLogs[logIndex].plano = item.plano || '--';
                currentLogs[logIndex].valorPlano = item.valorPlano || '--';
                if (item.uf && item.uf !== '--') {
                  currentLogs[logIndex].uf = item.uf;
                }
                logsUpdated = true;
                
                // Do VTME para o TIM
                const vtmeLog = currentLogs[logIndex];
                if (vtmeLog.bio && vtmeLog.bio !== '--') {
                  const existsList = lista.findIndex(old => old.ordem === item.ordem);
                  if (existsList !== -1) {
                    lista[existsList].bio = vtmeLog.bio;
                  }
                }
              }
            }
          });

          const newState = { extractedData: lista };
          if (logsUpdated) newState.logs = currentLogs;
          return newState;
        });
      },

      updateVtmeData: (data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        set((state) => {
          let currentLogs = [...state.logs];
          let novosCount = 0;
          let novosCanc = 0;
          const timList = Array.isArray(state.extractedData) ? [...state.extractedData] : [];

          data.forEach(novoItem => {
            const logIndex = currentLogs.findIndex(pl => 
              pl.cliente === novoItem.cliente || 
              (novoItem.cpf && novoItem.cpf !== '--' && pl.cpf === novoItem.cpf) ||
              (novoItem.cnpj && novoItem.cnpj !== '--' && pl.cnpj === novoItem.cnpj)
            );

            const novoStatus = novoItem.statusCanc === 'SOLICITADO' ? '✅ SOLICITADO' : '⏳ PENDENTE';
            
            let foundInfraCo = '--';
            let foundPlano = '--';
            let foundValorPlano = '--';
            let foundUf = novoItem.uf || '--';

            const cleanCPF = novoItem.cpf && novoItem.cpf !== '--' ? novoItem.cpf.replace(/\D/g, '') : '';
            const cleanCNPJ = novoItem.cnpj && novoItem.cnpj !== '--' ? novoItem.cnpj.replace(/\D/g, '') : '';
            let timItemIndex = -1;
            
            if (cleanCPF) {
              timItemIndex = timList.findIndex(t => t.cpf && t.cpf.replace(/\D/g, '') === cleanCPF);
            }
            if (timItemIndex === -1 && cleanCNPJ) {
              timItemIndex = timList.findIndex(t => t.cnpj && t.cnpj.replace(/\D/g, '') === cleanCNPJ);
            }
            if (timItemIndex === -1 && novoItem.cliente && novoItem.cliente !== 'Desconhecido') {
              const searchName = novoItem.cliente.trim().toLowerCase();
              timItemIndex = timList.findIndex(t => t.nome && t.nome.trim().toLowerCase() === searchName);
            }

            if (timItemIndex !== -1) {
              const timItem = timList[timItemIndex];
              foundInfraCo = timItem.infraco || '--';
              foundPlano = timItem.plano || '--';
              foundValorPlano = timItem.valorPlano || '--';
              if (timItem.uf && timItem.uf !== '--') foundUf = timItem.uf;
              
              // Sincroniza Biometria, Consultor e Supervisor do VTME de volta para o TIM Vendas (extractedData)
              let updatedTimItem = { ...timItem };
              if (novoItem.bio) {
                updatedTimItem.bio = novoItem.bio;
              }
              if (novoItem.consultor) {
                updatedTimItem.consultor = novoItem.consultor;
              }
              if (novoItem.supervisor) {
                updatedTimItem.supervisor = novoItem.supervisor;
              }
              timList[timItemIndex] = updatedTimItem;
            }

            if (logIndex === -1) {
              currentLogs.unshift({
                id: Date.now() + Math.random(),
                data: new Date().toLocaleDateString('pt-BR'),
                hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                cliente: novoItem.cliente || 'NOME NÃO ENCONTRADO',
                cpf: novoItem.cpf || '--',
                cnpj: novoItem.cnpj || '--',
                bio: novoItem.bio || '--',
                uf: foundUf,
                consultor: novoItem.consultor || 'Consultor',
                supervisor: novoItem.supervisor || 'Supervisor',
                statusCanc: novoStatus,
                infraco: foundInfraCo,
                plano: foundPlano,
                valorPlano: foundValorPlano
              });
              novosCount++;
              if (novoItem.statusCanc === 'SOLICITADO') novosCanc++;
            } else {
              let updatedLog = { ...currentLogs[logIndex] };
              let wasUpdated = false;

              if (updatedLog.statusCanc !== novoStatus) {
                if (novoStatus === '✅ SOLICITADO') novosCanc++;
                updatedLog.statusCanc = novoStatus;
                wasUpdated = true;
              }

              if (novoItem.bio && (!updatedLog.bio || updatedLog.bio === '--')) {
                updatedLog.bio = novoItem.bio;
                wasUpdated = true;
              }
              
              if (foundInfraCo !== '--' && (!updatedLog.infraco || updatedLog.infraco === '--')) {
                updatedLog.infraco = foundInfraCo;
                wasUpdated = true;
              }
              
              if (foundPlano !== '--' && (!updatedLog.plano || updatedLog.plano === '--')) {
                updatedLog.plano = foundPlano;
                wasUpdated = true;
              }

              if (foundValorPlano !== '--' && (!updatedLog.valorPlano || updatedLog.valorPlano === '--')) {
                updatedLog.valorPlano = foundValorPlano;
                wasUpdated = true;
              }

              if (foundUf !== '--' && (!updatedLog.uf || updatedLog.uf === '--')) {
                updatedLog.uf = foundUf;
                wasUpdated = true;
              }

              if (novoItem.consultor && novoItem.consultor !== 'Consultor' && novoItem.consultor !== 'Não Identificado' && (!updatedLog.consultor || updatedLog.consultor === 'Consultor' || updatedLog.consultor === 'Não Identificado')) {
                updatedLog.consultor = novoItem.consultor;
                wasUpdated = true;
              }

              if (novoItem.supervisor && novoItem.supervisor !== 'Supervisor' && novoItem.supervisor !== 'Não Identificado' && (!updatedLog.supervisor || updatedLog.supervisor === 'Supervisor' || updatedLog.supervisor === 'Não Identificado')) {
                updatedLog.supervisor = novoItem.supervisor;
                wasUpdated = true;
              }

              if (novoItem.cpf && novoItem.cpf !== '--' && (!updatedLog.cpf || updatedLog.cpf === '--')) {
                updatedLog.cpf = novoItem.cpf;
                wasUpdated = true;
              }

              if (novoItem.cnpj && novoItem.cnpj !== '--' && (!updatedLog.cnpj || updatedLog.cnpj === '--')) {
                updatedLog.cnpj = novoItem.cnpj;
                wasUpdated = true;
              }

              if (wasUpdated) {
                currentLogs[logIndex] = updatedLog;
              }
            }
          });

          let newState = { logs: currentLogs, extractedData: timList };
          if (novosCount > 0) newState.vendasHoje = state.vendasHoje + novosCount;
          if (novosCanc > 0) newState.cancelamentosHoje = state.cancelamentosHoje + novosCanc;
          
          const lastConsultor = data[0]?.consultor;
          if (lastConsultor && lastConsultor !== 'Consultor' && lastConsultor !== 'Não Identificado') {
            newState.vendedor = lastConsultor;
          }

          return newState;
        });
      },
      
      toggleVtmePause: () => {
        const current = get().isVtmePaused;
        socket.emit('set_vtme_pause', !current);
      },

      unlockRobots: async () => {
        try {
          const res = await apiFetch('/unlock-robots', { method: 'POST' });
          if (res.ok) {
            set({ isVtmePaused: true }); // Pausa para evitar novo re-lock imediato
            socket.emit('set_vtme_pause', true);
            return true;
          }
        } catch (e) {
          console.error(e);
        }
        return false;
      },

      // Limpeza Diária
      checkDailyReset: () => {
        const today = new Date().toLocaleDateString('pt-BR');
        const lastReset = localStorage.getItem('vtme_last_reset');
        if (lastReset !== today) {
          console.log(`♻️ Novo dia detectado (\${today}). Resetando contadores...`);
          set({ vendasHoje: 0, cancelamentosHoje: 0, logs: [] });
          localStorage.setItem('vtme_last_reset', today);
        }
      },

      // Inicializar Socket e Listeners
      initSocket: (user) => {
        if (user) {
          socket.io.opts.query = { perfil: user.perfil };
        }
        if (!socket.connected) {
          socket.connect();
        }

        socket.on('connect', () => {
          set({ bridgeHealth: { status: 'ok', browser: true } });
        });

        socket.on('vtme_pause_status', (paused) => {
          set({ isVtmePaused: paused });
        });

        socket.on('disconnect', () => {
          set({ bridgeHealth: { status: 'offline', browser: false } });
        });

        socket.on('status_update', (msg) => {
          set({ status: { text: msg.text, active: msg.active } });
        });

        socket.on('vtme_data', (payload) => {
          const { success, data } = payload;
          if (success && Array.isArray(data) && data.length > 0) {
            get().updateVtmeData(data);
          }
        });

        socket.on('tim_data', (payload) => {
          const { success, data } = payload;
          if (success && Array.isArray(data) && data.length > 0) {
            get().updateTimData(data);
          }
        });
      },
      
      cleanupSocket: () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('status_update');
        socket.off('vtme_data');
        socket.off('tim_data');
        socket.off('vtme_pause_status');
        if (socket.connected) {
          socket.disconnect();
        }
      }
    }),
    {
      name: 'vtme-storage',
      partialize: (state) => ({
        logs: state.logs,
        vendasHoje: state.vendasHoje,
        cancelamentosHoje: state.cancelamentosHoje,
        vendedor: state.vendedor
      }), // Persiste apenas os dados cruciais
    }
  )
);
