import React from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';

export default function PasteNumbersModal({
  isOpen,
  pasteType,
  pasteContent,
  setPasteContent,
  onClose,
  onSave
}) {
  return (
    <Modal isOpen={isOpen} title={`Colar Números (${pasteType === 'dial' ? 'Discagem' : 'Disparo'})`} onClose={onClose} width="450px">
      <div style={{ marginBottom: '15px' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginBottom: '15px' }}>
          Cole um número por linha abaixo:
        </p>
        <textarea
          className="code-textarea"
          style={{
            width: '100%',
            height: '350px',
            fontSize: '1rem',
            backgroundColor: '#0F172A',
            borderRadius: '10px',
            border: '1px solid #334155',
            padding: '15px',
            marginBottom: '20px'
          }}
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          autoFocus
          placeholder="Ex:\n81999998888\n81988887777..."
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave}>
          <Plus size={16} /> Adicionar à Lista
        </button>
      </div>
    </Modal>
  );
}
