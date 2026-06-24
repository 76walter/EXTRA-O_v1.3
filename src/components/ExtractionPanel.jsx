import React from 'react';
import { FileText, Zap, Plus, Edit3, Trash2, Copy, Upload } from 'lucide-react';
import MaskModal from './MaskModal';
import { showToast } from './Toast';
import { Skeleton } from './Skeleton';

export default function ExtractionPanel({
  masks,
  selectedMask,
  setSelectedMask,
  extractedData,
  previewContent,
  status,
  handleExtract,
  handleLaunchSpreadsheet,
  openAddModal,
  openEditModal,
  handleDeleteMask,
  copyToClipboard,
  isModalOpen,
  editingMaskName,
  maskForm,
  setMaskForm,
  onCloseMaskModal,
  onSaveMask
}) {
  return (
    <>
      <div className="header-bar">
        <div className="title-group">
          <FileText className="text-primary" />
          <span className="page-title">Preview da Máscara</span>
          <button className="btn btn-primary" onClick={() => handleExtract('vtme')}>
            <Zap size={14} /> Extrair Data
          </button>
          <button className="btn btn-success" style={{ height: '32px', padding: '0 15px' }} onClick={handleLaunchSpreadsheet}>
            <Upload size={14} /> Lançar Planilha
          </button>
        </div>
        <div className="action-group" style={{ gap: '8px' }}>
          <select
            className="select-custom"
            style={{ height: '32px' }}
            value={selectedMask}
            onChange={(e) => setSelectedMask(e.target.value)}
          >
            {Object.keys(masks).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={openAddModal} title="Nova Máscara"><Plus size={14} /></button>
          <button className="btn-icon-mini" style={{ width: '32px', height: '32px' }} onClick={openEditModal} title="Editar Máscara"><Edit3 size={14} /></button>
          <button className="btn-icon-mini danger" style={{ width: '32px', height: '32px' }} onClick={handleDeleteMask} title="Excluir Máscara"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="editor-area">
        {status?.text && status.text.toLowerCase().includes('extraindo') ? (
          <div style={{ padding: '20px', height: '100%', width: '100%' }}>
            <Skeleton height="30px" className="mb-4" />
            <Skeleton height="20px" width="80%" className="mb-2" />
            <Skeleton height="20px" width="90%" className="mb-2" />
            <Skeleton height="20px" width="70%" className="mb-4" />
            <Skeleton height="20px" width="85%" className="mb-2" />
            <Skeleton height="20px" width="60%" className="mb-2" />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
               <Zap className="text-primary animate-pulse w-12 h-12 mx-auto mb-2" />
               <p className="text-primary font-medium">Extraindo dados...</p>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="code-textarea"
              value={previewContent}
              readOnly
            />
            <div className="copy-btn-overlay">
              <button className="btn btn-primary" onClick={() => copyToClipboard(previewContent)}>
                <Copy size={16} /> Copiar
              </button>
            </div>
          </>
        )}
      </div>

      <div className="variables-helper">
        <div className="variables-title">
          <FileText size={14} style={{ color: 'var(--primary)' }} />
          <span>Legenda de Variáveis Úteis (Clique para copiar)</span>
        </div>
        <div className="variables-list">
          {['{nome_cliente}', '{cpf_cliente}', '{cnpj_cliente}', '{tel1}', '{tel2}', '{email}', '{endereco}', '{plano}', '{valor_plano}', '{data_vencimento}', '{nome_mae}', '{data_nascimento}'].map(tag => (
            <span
              key={tag}
              className="variable-badge"
              onClick={() => {
                navigator.clipboard.writeText(tag);
                showToast(`Variável ${tag} copiada!`, "success");
              }}
              title="Clique para copiar a tag"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <MaskModal
        isOpen={isModalOpen}
        editingMaskName={editingMaskName}
        maskForm={maskForm}
        setMaskForm={setMaskForm}
        onClose={onCloseMaskModal}
        onSave={onSaveMask}
      />
    </>
  );
}
