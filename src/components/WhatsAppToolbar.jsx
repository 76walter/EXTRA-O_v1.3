import React from 'react';
import { ExternalLink, FolderOpen, Settings } from 'lucide-react';
import { DEFAULT_UF_OPTIONS } from '../utils';

export default function WhatsAppToolbar({
  activeSheet,
  waSheets,
  setActiveSheet,
  handleOpenSheetModal,
  isUfOpen,
  waUF,
  setIsUfOpen,
  handleUFClick,
  fileInputRef,
  handleFileChange,
  dialListLength
}) {
  return (
    <div className="secondary-toolbar" style={{
      background: '#0F172A',
      borderBottom: '1px solid #1E293B',
      padding: '8px 25px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px'
    }}>
      <div className="action-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 'bold' }}>PLANILHA:</span>
        <select
          className="select-custom"
          style={{ height: '30px', width: '130px', fontSize: '0.75rem' }}
          value={activeSheet}
          onChange={(e) => setActiveSheet(e.target.value)}
        >
          {Object.keys(waSheets).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary" style={{ width: '30px', height: '30px', padding: 0 }} onClick={handleOpenSheetModal} title="Gerenciar Planilhas">
          <Settings size={12} />
        </button>
        <button className="btn btn-secondary" style={{ height: '30px', padding: '0 12px', display: 'flex', gap: '5px', fontSize: '0.75rem' }} onClick={() => window.open(waSheets[activeSheet] || 'https://onedrive.live.com/', '_blank')}>
          <ExternalLink size={12} /> Abrir Planilha
        </button>
      </div>

      <div className="action-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <button
            className={`btn btn-secondary ${isUfOpen ? 'active' : ''}`}
            onClick={() => setIsUfOpen(!isUfOpen)}
            style={{ minWidth: '90px', height: '30px', justifyContent: 'space-between', padding: '0 12px', fontSize: '0.75rem' }}
          >
            <span>UF: {waUF}</span>
            <FolderOpen size={12} />
          </button>
          {isUfOpen && (
            <div className="uf-vertical-menu" style={{ minWidth: '90px', top: '100%', zIndex: 100 }}>
              {DEFAULT_UF_OPTIONS.filter(u => u !== 'TODOS').map(u => (
                <button key={u} className="uf-menu-item" onClick={() => handleUFClick(u)} style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="status-indicator" style={{ background: '#1E293B', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem' }}>
          <input type="file" ref={fileInputRef} hidden accept=".xlsx, .csv, .txt" onChange={handleFileChange} />
          <div className="status-dot active"></div>
          <span style={{ fontWeight: 'bold' }}>{dialListLength} CONTATOS</span>
        </div>
      </div>
    </div>
  );
}
