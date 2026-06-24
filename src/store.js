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
      initSocket: () => {
        if (!socket.connected) {
          socket.connect();
        }

        socket.on('connect', () => {
          set({ bridgeHealth: { status: 'ok', browser: true } });
        });

        socket.on('disconnect', () => {
          set({ bridgeHealth: { status: 'offline', browser: false } });
        });

        socket.on('status_update', (msg) => {
          set({ status: { text: msg.text, active: msg.active } });
        });

        socket.on('vtme_data', (payload) => {
          const { success, data, message } = payload;
          
          if (success && Array.isArray(data) && data.length > 0) {
            set((state) => {
              let currentLogs = [...state.logs];
              let novosCount = 0;
              let novosCanc = 0;

              data.forEach(novoItem => {
                const logIndex = currentLogs.findIndex(pl => 
                  pl.cliente === novoItem.cliente || 
                  (novoItem.cpf && pl.cpf === novoItem.cpf)
                );

                const novoStatus = novoItem.statusCanc === 'SOLICITADO' ? '✅ SOLICITADO' : '⏳ PENDENTE';

                if (logIndex === -1) {
                  currentLogs.unshift({
                    id: Date.now() + Math.random(),
                    data: new Date().toLocaleDateString('pt-BR'),
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    cliente: novoItem.cliente || 'NOME NÃO ENCONTRADO',
                    cpf: novoItem.cpf,
                    uf: novoItem.uf || '--',
                    consultor: novoItem.consultor || 'Consultor',
                    supervisor: novoItem.supervisor || 'Supervisor',
                    statusCanc: novoStatus
                  });
                  novosCount++;
                  if (novoItem.statusCanc === 'SOLICITADO') novosCanc++;
                } else {
                  if (currentLogs[logIndex].statusCanc !== novoStatus) {
                    if (novoStatus === '✅ SOLICITADO') novosCanc++;
                    currentLogs[logIndex] = { ...currentLogs[logIndex], statusCanc: novoStatus };
                  }
                }
              });

              let newState = { logs: currentLogs };
              if (novosCount > 0) newState.vendasHoje = state.vendasHoje + novosCount;
              if (novosCanc > 0) newState.cancelamentosHoje = state.cancelamentosHoje + novosCanc;
              
              const lastConsultor = data[0]?.consultor;
              if (lastConsultor && lastConsultor !== 'Consultor' && lastConsultor !== 'Não Identificado') {
                newState.vendedor = lastConsultor;
              }

              return newState;
            });
          }
        });

        socket.on('tim_data', (payload) => {
          const { success, data, message } = payload;
          if (success && Array.isArray(data) && data.length > 0) {
            set((state) => {
              const lista = Array.isArray(state.extractedData) ? [...state.extractedData] : [];
              let novos = 0;
              data.forEach(item => {
                const exists = lista.findIndex(old => old.ordem === item.ordem);
                if (exists !== -1) {
                  lista[exists] = { ...lista[exists], ...item };
                } else {
                  lista.push({ ...item, launched: false });
                  novos++;
                }
              });
              return { extractedData: lista };
            });
          }
        });
      },
      
      cleanupSocket: () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('status_update');
        socket.off('vtme_data');
        socket.off('tim_data');
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
