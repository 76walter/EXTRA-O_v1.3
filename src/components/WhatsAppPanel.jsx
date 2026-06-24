import React, { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, Zap, History, Plus, Copy, Trash2, Send, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

export default function WhatsAppPanel({
  templates,
  waTemplate,
  waMessage,
  setWaTemplate,
  setWaMessage,
  handleAddTemplate,
  handleEditTemplate,
  handleDeleteTemplate,
  dialList,
  calledNumbers,
  sendList,
  handleCallClick,
  handleSendWhatsApp,
  startBatchDispatch,
  pauseBatchDispatch,
  stopBatchDispatch,
  dispatchState = { isActive: false, isPaused: false, progress: { sent: 0, total: 0 } },
  dispatchDelay = 240,
  setDispatchDelay,
  loadNextDialBatch,
  loadNextSendBatch,
  addManualNumber,
  copyList,
  clearDialList,
  clearSendList,
  setSendList,
  formatPhone
}) {
  // Local States for Dial List (Ligar)
  const [dialSearch, setDialSearch] = useState('');
  const [dialFilter, setDialFilter] = useState('ALL'); // ALL, PENDING, CALLED
  const [dialPage, setDialPage] = useState(1);
  const [dialPageSize, setDialPageSize] = useState(15);

  // Local States for Send List (Disparo)
  const [sendSearch, setSendSearch] = useState('');
  const [sendFilter, setSendFilter] = useState('ALL'); // ALL, PENDING, SENT
  const [sendPage, setSendPage] = useState(1);
  const [sendPageSize, setSendPageSize] = useState(15);

  // Reset page indices when lists change
  useEffect(() => {
    setDialPage(1);
  }, [dialList.length]);

  useEffect(() => {
    setSendPage(1);
  }, [sendList.length]);

  // Filtering Logic - Dial List
  const filteredDialList = dialList.filter(item => {
    const cleanSearch = dialSearch.trim().toLowerCase();
    const matchesSearch = !cleanSearch || item.number.includes(cleanSearch);
    if (!matchesSearch) return false;

    const isCalled = calledNumbers.has(item.number);
    if (dialFilter === 'PENDING') return !isCalled;
    if (dialFilter === 'CALLED') return isCalled;
    return true;
  });

  // Filtering Logic - Send List
  const filteredSendList = sendList.filter(item => {
    const cleanSearch = sendSearch.trim().toLowerCase();
    const matchesSearch = !cleanSearch || item.number.includes(cleanSearch);
    if (!matchesSearch) return false;

    if (sendFilter === 'PENDING') return !item.sent;
    if (sendFilter === 'SENT') return item.sent;
    return true;
  });

  // Pagination Logic - Dial List
  const totalDialItems = filteredDialList.length;
  const totalDialPages = Math.ceil(totalDialItems / dialPageSize) || 1;
  const activeDialPage = Math.max(1, Math.min(dialPage, totalDialPages));
  const dialStartIndex = (activeDialPage - 1) * dialPageSize;
  const dialEndIndex = Math.min(dialStartIndex + dialPageSize, totalDialItems);
  const paginatedDialList = filteredDialList.slice(dialStartIndex, dialEndIndex);

  // Pagination Logic - Send List
  const totalSendItems = filteredSendList.length;
  const totalSendPages = Math.ceil(totalSendItems / sendPageSize) || 1;
  const activeSendPage = Math.max(1, Math.min(sendPage, totalSendPages));
  const sendStartIndex = (activeSendPage - 1) * sendPageSize;
  const sendEndIndex = Math.min(sendStartIndex + sendPageSize, totalSendItems);
  const paginatedSendList = filteredSendList.slice(sendStartIndex, sendEndIndex);

  return (
    <div className={`tab-panel active`}>
      <div className="whatsapp-grid" style={{ gridTemplateColumns: '1.8fr 0.8fr 0.8fr' }}>
        
        {/* Panel 1: Message Editor */}
        <div className="wa-list-container">
          <div className="wa-list-header" style={{ borderBottom: '1px solid #2563EB33', background: '#2563EB11' }}>
            <span className="wa-list-title"><MessageSquare size={16} color="#2563EB" /> Mensagem</span>
            <div className="action-group" style={{ gap: '8px' }}>
              <select className="select-custom" style={{ width: '280px', fontSize: '0.75rem', height: '32px', textOverflow: 'ellipsis' }} value={waTemplate} onChange={(e) => {
                setWaTemplate(e.target.value);
                setWaMessage(templates[e.target.value]);
              }}>
                {Object.keys(templates).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={handleAddTemplate} title="Novo Modelo"><Plus size={14} /></button>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={handleEditTemplate} title="Editar Modelo"><Edit3 size={14} /></button>
              <button className="btn-icon-mini danger" style={{ width: '32px', height: '32px' }} onClick={handleDeleteTemplate} title="Excluir Modelo"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="wa-scroll-area" style={{ padding: '0' }}>
            <textarea
              className="code-textarea"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              style={{ height: '100%', fontSize: '0.85rem', border: 'none', background: 'transparent', padding: '15px' }}
            />
          </div>
        </div>

        {/* Panel 2: Dial List (Ligar) */}
        <div className="wa-list-container">
          <div className="wa-list-header" style={{ borderBottom: '1px solid #2196F333', background: '#2196F311' }}>
            <span className="wa-list-title" style={{ color: '#2196F3' }} title="Fila Ligar"><PhoneCall size={16} /> Ligar</span>
            <div className="action-group" style={{ gap: '8px' }}>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={loadNextDialBatch} title="Próximo Lote de Ligação"><History size={14} /></button>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={() => addManualNumber('dial')} title="Adicionar Contatos"><Plus size={14} /></button>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={() => copyList(dialList)} title="Copiar Lista"><Copy size={14} /></button>
              <button className="btn-icon-mini danger" style={{ width: '32px', height: '32px' }} onClick={clearDialList} title="Limpar Lista"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="list-filter-bar">
            <input
              type="text"
              className="list-search-input"
              placeholder="🔍 Pesquisar número..."
              value={dialSearch}
              onChange={(e) => {
                setDialSearch(e.target.value);
                setDialPage(1);
              }}
            />
            <div className="list-filter-tabs">
              <button
                className={`list-filter-tab ${dialFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => { setDialFilter('ALL'); setDialPage(1); }}
              >
                Todos
              </button>
              <button
                className={`list-filter-tab ${dialFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => { setDialFilter('PENDING'); setDialPage(1); }}
              >
                Pendente
              </button>
              <button
                className={`list-filter-tab ${dialFilter === 'CALLED' ? 'active' : ''}`}
                onClick={() => { setDialFilter('CALLED'); setDialPage(1); }}
              >
                Ligar
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="wa-scroll-area">
            {paginatedDialList.length > 0 ? paginatedDialList.map((item, idx) => (
              <div
                key={item.number}
                className={`phone-item-card ${calledNumbers.has(item.number) ? 'completed' : ''}`}
                onClick={() => handleCallClick(item.number)}
              >
                <span className="phone-number">{formatPhone(item.number)}</span>
                <button className="btn-call-mini">
                  <PhoneCall size={12} />
                </button>
              </div>
            )) : (
              <div className="empty-state">
                {dialList.length === 0 ? 'Selecione um UF para carregar' : 'Nenhum resultado encontrado'}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalDialItems > 0 && (
            <div className="pagination-container" style={{ padding: '8px 12px' }}>
              <span className="pagination-info" style={{ fontSize: '0.7rem' }}>
                {dialStartIndex + 1}-{dialEndIndex} de {totalDialItems}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  style={{ padding: '4px 8px' }}
                  disabled={activeDialPage === 1}
                  onClick={() => setDialPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="pagination-page-indicator" style={{ fontSize: '0.75rem', padding: '0 5px' }}>
                  {activeDialPage}/{totalDialPages}
                </span>
                <button
                  className="pagination-btn"
                  style={{ padding: '4px 8px' }}
                  disabled={activeDialPage === totalDialPages}
                  onClick={() => setDialPage(prev => Math.min(totalDialPages, prev + 1))}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: Send List (Disparo) */}
        <div className="wa-list-container highlighted">
          <div className="wa-list-header" style={{ borderBottom: '1px solid #10B98133', background: '#10B98111' }}>
            <span className="wa-list-title" style={{ color: '#10B981' }} title="Disparo"><Zap size={16} /> Disparo</span>
            <div className="action-group" style={{ gap: '8px' }}>
              {dispatchState.isActive ? (
                <>
                  <button 
                    className="btn-icon-mini" 
                    style={{ background: dispatchState.isPaused ? '#10B981' : '#F59E0B', borderColor: dispatchState.isPaused ? '#10B981' : '#F59E0B', color: 'white', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={startBatchDispatch} 
                    title={dispatchState.isPaused ? "Retomar Disparo" : "Pausar Disparo"}
                  >
                    {dispatchState.isPaused ? (
                      <Zap size={14} fill="currentColor" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="5" y="4" width="4" height="16" />
                        <rect x="15" y="4" width="4" height="16" />
                      </svg>
                    )}
                  </button>
                  <button 
                    className="btn-icon-mini danger" 
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={stopBatchDispatch} 
                    title="Parar Disparo"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16" />
                    </svg>
                  </button>
                </>
              ) : (
                <button 
                  className="btn-icon-mini" 
                  style={{ background: '#10B981', borderColor: '#10B981', color: 'white', width: '32px', height: '32px' }} 
                  onClick={startBatchDispatch} 
                  title="Iniciar Disparo"
                >
                  <Zap size={14} fill="currentColor" />
                </button>
              )}
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={loadNextSendBatch} title="Próximo Lote de Disparo"><History size={14} /></button>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={() => addManualNumber('send')} title="Adicionar"><Plus size={14} /></button>
              <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={() => copyList(sendList)} title="Copiar Tudo"><Copy size={14} /></button>
              <button className="btn-icon-mini danger" style={{ width: '32px', height: '32px' }} onClick={clearSendList} title="Limpar Lista"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Progress Bar & Controls Center when Dispatching */}
          {dispatchState.isActive && (
            <div style={{ padding: '12px 20px', background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>
                  {dispatchState.isPaused ? '⏸️ Disparo Pausado' : '🚀 Disparando em Lote...'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {dispatchState.progress.sent} / {dispatchState.progress.total} ({Math.round((dispatchState.progress.sent / (dispatchState.progress.total || 1)) * 100)}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${(dispatchState.progress.sent / (dispatchState.progress.total || 1)) * 100}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #10B981, #34D399)', 
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }} 
                />
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="list-filter-bar">
            <input
              type="text"
              className="list-search-input"
              placeholder="🔍 Pesquisar número..."
              value={sendSearch}
              onChange={(e) => {
                setSendSearch(e.target.value);
                setSendPage(1);
              }}
            />
            <div className="list-filter-tabs">
              <button
                className={`list-filter-tab ${sendFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => { setSendFilter('ALL'); setSendPage(1); }}
              >
                Todos
              </button>
              <button
                className={`list-filter-tab ${sendFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => { setSendFilter('PENDING'); setSendPage(1); }}
              >
                Pendente
              </button>
              <button
                className={`list-filter-tab ${sendFilter === 'SENT' ? 'active' : ''}`}
                onClick={() => { setSendFilter('SENT'); setSendPage(1); }}
              >
                Enviado
              </button>
            </div>
          </div>

          {/* Delay Control Slider */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              <span>Atraso entre Envios:</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>
                {dispatchDelay >= 60 
                  ? `${Math.floor(dispatchDelay / 60)}m ${dispatchDelay % 60}s` 
                  : `${dispatchDelay}s`}
              </span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="600" 
              step="5" 
              value={dispatchDelay} 
              onChange={(e) => setDispatchDelay(Number(e.target.value))}
              style={{ 
                width: '100%', 
                accentColor: '#10B981', 
                height: '4px', 
                borderRadius: '2px', 
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', opacity: 0.6 }}>
              <span>5s (Rápido)</span>
              <span>10m (Seguro)</span>
            </div>
          </div>

          {/* List Area */}
          <div className="wa-scroll-area">
            {paginatedSendList.length > 0 ? paginatedSendList.map((item, idx) => (
              <div
                key={item.number}
                className={`phone-item-card ${item.sent ? 'completed' : ''}`}
                onClick={() => {
                  handleSendWhatsApp(item.number, waMessage).then(success => {
                    if (success) {
                      const newList = [...sendList];
                      const realIndex = newList.findIndex(x => x.number === item.number);
                      if (realIndex !== -1) {
                        newList[realIndex] = { ...newList[realIndex], sent: true };
                        setSendList(newList);
                      }
                    }
                  });
                }}
              >
                <span className="phone-number">{formatPhone(item.number)}</span>
                <button className="btn-call-mini" style={{ background: 'var(--success)' }}>
                  <Send size={12} />
                </button>
              </div>
            )) : (
              <div className="empty-state">
                {sendList.length === 0 ? 'Lista Vazia' : 'Nenhum resultado encontrado'}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalSendItems > 0 && (
            <div className="pagination-container" style={{ padding: '8px 12px' }}>
              <span className="pagination-info" style={{ fontSize: '0.7rem' }}>
                {sendStartIndex + 1}-{sendEndIndex} de {totalSendItems}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  style={{ padding: '4px 8px' }}
                  disabled={activeSendPage === 1}
                  onClick={() => setSendPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="pagination-page-indicator" style={{ fontSize: '0.75rem', padding: '0 5px' }}>
                  {activeSendPage}/{totalSendPages}
                </span>
                <button
                  className="pagination-btn"
                  style={{ padding: '4px 8px' }}
                  disabled={activeSendPage === totalSendPages}
                  onClick={() => setSendPage(prev => Math.min(totalSendPages, prev + 1))}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

