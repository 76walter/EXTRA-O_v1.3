import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XSquare, KeyRound, LogIn } from 'lucide-react';

export default function TokenModal({ isOpen, onClose, onSubmit, isInjecting }) {
  const [token, setToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    onSubmit(token);
    setToken(''); // Limpar ao enviar
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="modal-content"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '450px',
            padding: '25px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            <XSquare size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '12px',
              color: '#10B981'
            }}>
              <KeyRound size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Token TIM Vendas</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                Insira o código RSA de 6 dígitos gerado pelo seu app.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Código RSA Atual</label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: 123456"
                className="select-custom"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={{
                  fontSize: '1.5rem',
                  letterSpacing: '5px',
                  textAlign: 'center',
                  padding: '15px',
                  fontWeight: 'bold',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text)'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isInjecting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-success"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={isInjecting || !token}
              >
                {isInjecting ? (
                  <>
                    <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%' }}></div>
                    Injetando...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Fazer Login
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
