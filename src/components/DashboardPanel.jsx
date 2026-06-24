import React, { useState, useEffect, memo } from 'react';
import { History, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, RefreshCcw, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { TableRowSkeleton } from './Skeleton';

const DashboardPanel = memo(function DashboardPanel({
  filteredLogs,
  filterQuery,
  setFilterQuery,
  vendedor,
  vendasHoje,
  cancelamentosHoje,
  bridgeHealth
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const exportPDF = async () => {
    const dashboardElement = document.getElementById('dashboard-export-area');
    if (!dashboardElement) return;
    try {
      const canvas = await html2canvas(dashboardElement, { scale: 2, backgroundColor: '#0B0F19' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Dashboard_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
    }
  };

  const totalOps = vendasHoje + cancelamentosHoje;
  const vendasPct = totalOps > 0 ? Math.round((vendasHoje / totalOps) * 100) : 0;
  const cancPct = totalOps > 0 ? Math.round((cancelamentosHoje / totalOps) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="dashboard-wrapper"
      id="dashboard-export-area"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="card-grid"
      >
        <motion.div variants={itemVariants} className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Consultor Ativo</div>
            <div className="stat-value" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '180px' }}>{vendedor}</div>
          </div>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-hover)', borderRadius: '12px', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color="var(--success)" /> Vendas (Dia)</div>
            <div className="stat-value" style={{ color: 'var(--success)', fontSize: '2rem', lineHeight: '1' }}>{vendasHoje}</div>
          </div>
          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="3.5"
              />
              <path
                strokeDasharray={`${vendasPct}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--success)"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success)' }}>
              {vendasPct}%
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={14} color="var(--danger)" /> Cancelados</div>
            <div className="stat-value" style={{ color: 'var(--danger)', fontSize: '2rem', lineHeight: '1' }}>{cancelamentosHoje}</div>
          </div>
          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="3.5"
              />
              <path
                strokeDasharray={`${cancPct}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--danger)"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--danger)' }}>
              {cancPct}%
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="table-container" 
        style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 150px)' }}
      >
        <div className="wa-list-header" style={{ flexShrink: 0 }}>
          <span className="wa-list-title"><History size={16} /> Histórico de Lançamentos do Dia</span>
          <input
            className="select-custom"
            placeholder="🔍 Buscar Consultor ou Supervisor..."
            style={{ width: '300px' }}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <th>DATA</th>
                <th>HORA</th>
                <th>V</th>
                <th>CANCELAMENTO</th>
                <th>CLIENTE</th>
                <th>UF</th>
                <th>CONSULTOR</th>
                <th>SUPERVISOR</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode='popLayout'>
                {bridgeHealth?.status !== 'ok' && filteredLogs.length === 0 ? (
                  <>
                    <TableRowSkeleton columns={8} />
                    <TableRowSkeleton columns={8} />
                    <TableRowSkeleton columns={8} />
                    <TableRowSkeleton columns={8} />
                    <TableRowSkeleton columns={8} />
                  </>
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log, index) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td>{log.data}</td>
                      <td>{log.hora}</td>
                      <td>
                        <span className="badge badge-success">VENDA</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${log.statusCanc === '✅ SOLICITADO' ? 'badge-success' : 'badge-warning'}`}
                          style={{
                            background: log.statusCanc === '✅ SOLICITADO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: log.statusCanc === '✅ SOLICITADO' ? 'var(--success)' : 'var(--warning)',
                            border: `1px solid ${log.statusCanc === '✅ SOLICITADO' ? 'var(--success)' : 'var(--warning)'}`,
                            fontSize: '0.65rem'
                          }}
                        >
                          {log.statusCanc}
                        </span>
                      </td>
                      <td>{log.cliente}</td>
                      <td>{log.uf}</td>
                      <td>{log.consultor}</td>
                      <td>{log.supervisor}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      Nenhum lançamento encontrado para a busca.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="pagination-container" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pagination-info" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Mostrando {totalItems > 0 ? startIndex + 1 : 0} a {endIndex} de {totalItems} lançamentos
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
            <div className="pagination-controls" style={{ display: 'flex', gap: '5px' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 8px' }}
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '4px 8px' }}>
                {activePage} / {totalPages}
              </span>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 8px' }}
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default DashboardPanel;

