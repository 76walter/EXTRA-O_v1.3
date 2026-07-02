import React, { useState, useEffect } from 'react';
import { Zap, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { showToast } from './Toast';
import { useStore } from '../store';

export default function MacroTimPanel({ extractedData, handleExtract, handleLaunchMacro, setStatus, onOpenTokenModal }) {
  const setExtractedData = useStore(state => state.setExtractedData);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, LAUNCHED
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Track currently editing cell: { rowId, field, originalValue }
  const [editingCell, setEditingCell] = useState(null);

  const handleFieldChange = (rowId, field, value) => {
    setExtractedData(prev =>
      prev.map((order, idx) => {
        const currentId = order.id || order.ordem || `row-${idx}`;
        return currentId === rowId ? { ...order, [field]: value } : order;
      })
    );
  };

  const startEditingCell = (rowId, field, value) => {
    setEditingCell({ rowId, field, originalValue: value });
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e, rowId, field) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      // Revert to backup value
      if (editingCell) {
        handleFieldChange(rowId, field, editingCell.originalValue);
      }
      setEditingCell(null);
    }
  };

  const handleDelete = (rowId) => {
    setExtractedData(prev =>
      prev.filter((order, idx) => {
        const currentId = order.id || order.ordem || `row-${idx}`;
        return currentId !== rowId;
      })
    );
    showToast('Pedido excluído com sucesso.', 'info');
  };

  const handleAddRow = () => {
    const newId = `new-${Date.now()}`;
    const newOrder = {
      id: newId,
      nome: '',
      cpf: '',
      uf: '',
      ordem: '',
      data: new Date().toLocaleDateString('pt-BR'),
      bio: '',
      status: 'Em andamento',
      infraco: '',
      plano: '',
      valorPlano: '',
      datainst: '',
      statusinst: '',
      consultor: '',
      supervisor: '',
      launched: false
    };
    setExtractedData(prev => [newOrder, ...prev]);
    // Automatically set edit mode on Name field for new row
    setEditingCell({ rowId: newId, field: 'nome', originalValue: '' });
  };

  const totalCount = Array.isArray(extractedData) ? extractedData.length : 0;
  const pending = Array.isArray(extractedData) ? extractedData.filter(i => !i.launched) : [];
  const pendingCount = pending.length;
  const launchedCount = totalCount - pendingCount;

  // Filter orders
  const filteredOrders = (Array.isArray(extractedData) ? extractedData : []).filter(item => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      (item.nome && item.nome.toLowerCase().includes(q)) ||
      (item.cpf && item.cpf.includes(q)) ||
      (item.ordem && String(item.ordem).toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'PENDING') return !item.launched;
    if (statusFilter === 'LAUNCHED') return item.launched;
    return true;
  });

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginate orders
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Helper to render editable table cells
  const renderCell = (order, rowId, field, style = {}, options = null, customDisplay = null) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
    const value = order[field] || '';

    const inputStyle = {
      background: 'rgba(99, 102, 241, 0.15)',
      border: '1px solid var(--primary)',
      borderRadius: '6px',
      color: '#F8FAFC',
      padding: '4px 8px',
      fontSize: '0.8rem',
      outline: 'none',
      width: '100%',
      fontFamily: 'inherit'
    };

    const selectStyle = {
      ...inputStyle,
      appearance: 'none',
      paddingRight: '20px',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center'
    };

    return (
      <td 
        style={{ padding: '8px 12px', borderRight: '1px solid #334155', cursor: 'pointer', minWidth: '100px', ...style }}
        onDoubleClick={() => startEditingCell(rowId, field, value)}
        title="Clique duplo para editar"
      >
        {isEditing ? (
          options ? (
            <select 
              style={selectStyle} 
              value={value} 
              onChange={e => {
                handleFieldChange(rowId, field, e.target.value);
                setEditingCell(null);
              }}
              onBlur={handleBlur}
              autoFocus
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input 
              style={inputStyle} 
              value={value} 
              onChange={e => handleFieldChange(rowId, field, e.target.value)} 
              onBlur={handleBlur}
              onKeyDown={e => handleKeyDown(e, rowId, field)}
              autoFocus 
            />
          )
        ) : (
          customDisplay ? customDisplay : (value || <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.75rem' }}>clique duplo</span>)
        )}
      </td>
    );
  };

  return (
    <>
      <div className="header-bar">
        <div className="title-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Zap className="text-primary" />
          <span className="page-title">Macro Tim Vendas</span>
          <div className="count-badge-tim">{totalCount} Pedidos</div>
          <button className="btn btn-primary" onClick={() => handleExtract('tim')}>Extrair do App</button>
          <button className="btn btn-secondary" onClick={onOpenTokenModal} title="Forçar Login com Token RSA" style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={16} /> Login
          </button>
          <button className="btn btn-primary" onClick={handleAddRow} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' }}>
            Adicionar Pedido
          </button>
          <button className="btn btn-success" onClick={async () => {
            if (pending.length === 0) {
              showToast('Não há pedidos novos para lançar na planilha! Todos já estão lá.', 'info');
              setStatus({ text: '✅ Todos já foram lançados', active: true });
              return;
            }
            await handleLaunchMacro(pending);
          }}>
            Lançar na Planilha Macro
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="wa-list-header" style={{ marginBottom: '15px', borderRadius: '10px', display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            className="select-custom"
            placeholder="🔍 Buscar por Cliente, CPF ou Ordem..."
            style={{ width: '300px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: '32px' }}
              onClick={() => setStatusFilter('ALL')}
            >
              Todos
            </button>
            <button
              className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: '32px' }}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              className={`btn ${statusFilter === 'LAUNCHED' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: '32px' }}
              onClick={() => setStatusFilter('LAUNCHED')}
            >
              Lançados ({launchedCount})
            </button>
          </div>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Mostrando <strong>{totalItems}</strong> de {totalCount} pedidos
        </div>
      </div>

      <div className="wa-list-container" style={{ padding: '0', background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 240px)' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', background: '#0F172A', borderRadius: '12px', border: '1px solid #334155', flex: 1 }}>
          <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', color: '#F8FAFC', fontSize: '0.85rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1E293B' }}>
              <tr>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '220px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>NOME DO CLIENTE</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>CPF</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '70px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>UF</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '180px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>ORDEM DE VENDA</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '130px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>DATA VENDA</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>BIOMETRIA</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '140px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>STATUS GERAL</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '130px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>INFRACO</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '180px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>PLANO</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>VALOR DO PLANO</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '180px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>AGENDAMENTO INST.</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>STATUS INST.</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155', borderRight: '1px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>CONSULTOR</div>
                </th>
                <th style={{ padding: 0, borderBottom: '2px solid #334155' }}>
                  <div style={{ padding: '12px', resize: 'horizontal', overflow: 'hidden', minWidth: '150px', color: '#94A3B8', textAlign: 'left', display: 'inline-block', width: '100%' }}>SUPERVISOR</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? paginatedOrders.map((order, idx) => {
                const rowId = order.id || order.ordem || `row-${idx}`;
                return (
                  <tr key={rowId} style={{ borderBottom: '1px solid #334155', transition: 'background 0.3s', background: order.launched ? '#0F172A' : '#1E293B' }} className="table-row-hover">
                    {renderCell(order, rowId, 'nome', { fontWeight: 'bold' }, null, (
                      <>
                        {order.nome || <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.75rem' }}>clique duplo</span>}
                        {order.launched && <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: '#10B981', background: '#10B98122', padding: '2px 5px', borderRadius: '4px' }}>Lançado</span>}
                      </>
                    ))}
                    {renderCell(order, rowId, 'cpf', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'uf', { color: '#CBD5E1', fontWeight: 'bold' })}
                    {renderCell(order, rowId, 'ordem', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'data', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'bio', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'status', {}, ['Em andamento', 'Sucesso', 'Cancelado'], (
                      <span style={{
                         background: order.status === 'Em andamento' ? 'rgba(30, 58, 138, 0.4)' : '#334155',
                         color: '#60A5FA',
                         padding: '4px 10px',
                         borderRadius: '6px',
                         fontSize: '0.7rem',
                         fontWeight: 'bold',
                         border: '1px solid #1E40AF'
                      }}>
                        {order.status || 'Em andamento'}
                      </span>
                    ))}
                    {renderCell(order, rowId, 'infraco', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'plano', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'valorPlano', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'datainst', { color: '#10B981', fontWeight: 'bold' })}
                    {renderCell(order, rowId, 'statusinst', { color: '#F59E0B', fontWeight: 'bold' })}
                    {renderCell(order, rowId, 'consultor', { color: '#CBD5E1' })}
                    {renderCell(order, rowId, 'supervisor', { color: '#CBD5E1', borderRight: 'none' })}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="14" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    {totalCount === 0 ? 'Nenhum pedido "Em andamento" detectado. Aguardando atualização...' : 'Nenhum pedido corresponde à busca/filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Container */}
        <div className="pagination-container" style={{ marginTop: '15px', border: '1px solid var(--border)', borderRadius: '10px' }}>
          <div className="pagination-info">
            Mostrando {totalItems > 0 ? startIndex + 1 : 0} a {endIndex} de {totalItems} pedidos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Linhas por página:</span>
              <select
                className="select-custom"
                style={{ height: '28px', padding: '2px 25px 2px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                title="Página Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="pagination-page-indicator">
                {activePage} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title="Próxima Página"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
