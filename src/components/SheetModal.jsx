import React from 'react';
import Modal from './Modal';

export default function SheetModal({
  isOpen,
  sheetModalActive,
  sheetFormName,
  sheetFormLink,
  onActiveChange,
  onNameChange,
  onLinkChange,
  onNewSheet,
  onDeleteSheet,
  onSaveSheet,
  onClose,
  sheets
}) {
  return (
    <Modal isOpen={isOpen} title="Gerenciar Planilhas (OneDrive)" onClose={onClose} width="500px">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Planilhas Salvas:</label>
        <select
          className="select-custom"
          style={{ flex: 1, height: '36px' }}
          value={sheetModalActive}
          onChange={(e) => onActiveChange(e.target.value)}
        >
          {Object.keys(sheets).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-outline" style={{ height: '36px', padding: '0 15px', display: 'flex', gap: '5px' }} onClick={onNewSheet}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>+</span> NOVO
        </button>
      </div>

      <div style={{ background: '#0F172A', padding: '20px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#F8FAFC', fontWeight: 'bold', textAlign: 'center' }}>
            Nome da Planilha (Ex: Janeiro):
          </label>
          <input
            type="text"
            className="input-custom"
            style={{ width: '100%', height: '40px', background: '#1E293B' }}
            value={sheetFormName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#F8FAFC', fontWeight: 'bold', textAlign: 'center' }}>
            Link (Compartilhamento Web):
          </label>
          <input
            type="text"
            className="input-custom"
            style={{ width: '100%', height: '40px', background: '#1E293B', fontFamily: 'monospace', fontSize: '0.8rem' }}
            value={sheetFormLink}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="https://onedrive.live.com/..."
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
        <button className="btn" style={{ background: '#EF4444', color: 'white', flex: 1 }} type="button" onClick={onDeleteSheet}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>🗑️</span> EXCLUIR ABA ATUAL
        </button>
        <button className="btn" style={{ background: '#2563EB', color: 'white', flex: 1 }} type="button" onClick={onSaveSheet}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>💾</span> SALVAR NA LISTA
        </button>
      </div>
    </Modal>
  );
}
