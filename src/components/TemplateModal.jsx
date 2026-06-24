import React from 'react';
import Modal from './Modal';

export default function TemplateModal({
  isOpen,
  editMode,
  templateName,
  templateContent,
  setTemplateName,
  setTemplateContent,
  onClose,
  onSave
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={editMode === 'add' ? 'Novo Modelo de Mensagem' : 'Editar Modelo'}
      onClose={onClose}
      width="500px"
    >
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '5px' }}>
          Nome do Modelo:
        </label>
        <input
          type="text"
          className="input-custom"
          style={{ width: '100%', height: '40px' }}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Ex: QUALIDADE NOVO"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '5px' }}>
          Conteúdo da Mensagem:
        </label>
        <textarea
          className="code-textarea"
          style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#0F172A',
            borderRadius: '10px',
            padding: '15px'
          }}
          value={templateContent}
          onChange={(e) => setTemplateContent(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={onSave}>
          {editMode === 'add' ? 'Criar Modelo' : 'Salvar Alterações'}
        </button>
      </div>
    </Modal>
  );
}
