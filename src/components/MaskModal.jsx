import React from 'react';
import Modal from './Modal';

export default function MaskModal({
  isOpen,
  editingMaskName,
  maskForm,
  setMaskForm,
  onClose,
  onSave
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={editingMaskName ? 'Editar Máscara' : 'Nova Máscara'}
      onClose={onClose}
      width="600px"
    >
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#94A3B8' }}>
          Nome da Máscara
        </label>
        <input
          type="text"
          className="input-custom"
          style={{ width: '100%', height: '40px' }}
          value={maskForm.name}
          onChange={(e) => setMaskForm({ ...maskForm, name: e.target.value })}
          placeholder="Ex: Suporte Técnico..."
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#94A3B8' }}>
          Modelo do Texto
        </label>
        <textarea
          className="code-textarea"
          style={{ width: '100%', height: '200px', fontSize: '0.85rem' }}
          value={maskForm.template}
          onChange={(e) => setMaskForm({ ...maskForm, template: e.target.value })}
          placeholder="Cole aqui o texto da máscara..."
        />
      </div>

      <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '20px', backgroundColor: '#0F172A', padding: '10px', borderRadius: '6px' }}>
        Tags: {'{nome_cliente}, {cpf_cliente}, {cnpj_cliente}, {tel1}, {tel2}, {email}, {endereco}, {plano}, {valor_plano}, {data_vencimento}, {nome_mae}, {data_nascimento}'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={onSave}>Salvar Alterações</button>
      </div>
    </Modal>
  );
}
