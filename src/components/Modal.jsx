import React from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(8px)'
};

const contentStyle = {
  backgroundColor: '#1E293B',
  padding: '30px',
  borderRadius: '15px',
  border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px'
};

const titleStyle = {
  margin: 0,
  color: '#F8FAFC',
  fontSize: '1.1rem'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#94A3B8',
  cursor: 'pointer',
  fontSize: '1.2rem'
};

export default function Modal({ isOpen, title, onClose, width = '520px', children }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={{ ...contentStyle, width }}>
        <div style={headerStyle}>
          {title ? <h3 style={titleStyle}>{title}</h3> : <div />}
          {onClose && (
            <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="Fechar modal">
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
