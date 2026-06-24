import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export function showToast(message, type = 'info') {
  const event = new CustomEvent('add-toast', { detail: { message, type } });
  window.dispatchEvent(event);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAddToast = (e) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    window.addEventListener('add-toast', handleAddToast);
    return () => window.removeEventListener('add-toast', handleAddToast);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            style={{
              background: 'var(--card)',
              border: `1px solid ${
                toast.type === 'error' ? '#EF4444' : 
                toast.type === 'success' ? '#10B981' : '#3B82F6'
              }`,
              color: 'var(--text)',
              padding: '12px 18px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: '0.85rem',
              fontWeight: 600,
              pointerEvents: 'auto'
            }}
          >
            {toast.type === 'error' && <AlertCircle size={18} color="#EF4444" />}
            {toast.type === 'success' && <CheckCircle size={18} color="#10B981" />}
            {toast.type === 'info' && <Info size={18} color="#3B82F6" />}
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
