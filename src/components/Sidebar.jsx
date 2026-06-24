import React from 'react';
import { Globe, Zap, MessageSquare, PhoneCall, Server, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ status, setStatus, bridgeHealth = {} }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const isOnline = bridgeHealth.status === 'ok';
  const isBrowserOk = bridgeHealth.browser === true;

  return (
    <aside className="sidebar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="logo-container"
      >
        <div className="logo-spin-wrapper">
          <img src="/icone/logo_tela.png" alt="SISTEMA" className="logo-img" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="status-box"
      >
        <div className="status-indicator">
          <span className={`status-dot ${status.active ? 'active' : ''}`}></span>
          <span>{status.text}</span>
        </div>
      </motion.div>

      {/* ===== INDICADOR DE SAÚDE DA PONTE ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          padding: '10px 15px',
          margin: '0 15px 10px',
          borderRadius: '10px',
          background: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={12} />
            <span style={{ fontWeight: 600 }}>Ponte</span>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            fontWeight: 700,
            background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isOnline ? '#10B981' : '#EF4444',
            border: `1px solid ${isOnline ? '#10B98144' : '#EF444444'}`
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOnline ? '#10B981' : '#EF4444',
              boxShadow: isOnline ? '0 0 6px #10B981' : '0 0 6px #EF4444',
              animation: isOnline ? 'pulse 2s infinite' : 'none'
            }} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={12} />
              <span style={{ fontWeight: 600 }}>Navegador</span>
            </div>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: isBrowserOk ? '#10B981' : '#F59E0B'
            }}>
              {isBrowserOk ? `✅ ${bridgeHealth.pages?.length || 0} abas` : '⚠️ Inativo'}
            </span>
          </div>
        )}
        {isOnline && bridgeHealth.memory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', opacity: 0.7 }}>
            <span>RAM</span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>{bridgeHealth.memory.rss}</span>
          </div>
        )}
      </motion.div>

      <motion.nav 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="sidebar-nav"
      >
        <div className="nav-section">
          <motion.span variants={itemVariants} className="nav-label">Ferramentas</motion.span>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => {
              setStatus({ text: '🚀 Abrindo VTME...', active: true });
              fetch('http://localhost:3001/open-vtme');
            }}
          >
            <Globe size={18} /> Abrir VTME
          </motion.button>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => {
              setStatus({ text: '🚀 Abrindo App Tim...', active: true });
              fetch('http://localhost:3001/open-tim');
            }}
          >
            <Zap size={18} /> App Tim Vendas
          </motion.button>
        </div>

        <div className="nav-section">
          <motion.span variants={itemVariants} className="nav-label">Conexão</motion.span>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => {
              setStatus({ text: '🚀 Abrindo WhatsApp...', active: true });
              fetch('http://localhost:3001/open-whatsapp');
            }}
          >
            <MessageSquare size={18} /> WhatsApp Web
          </motion.button>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => {
              setStatus({ text: '🚀 Abrindo 3C Plus...', active: true });
              fetch('http://localhost:3001/open-3c');
            }}
          >
            <PhoneCall size={18} /> 3C Plus
          </motion.button>
        </div>
      </motion.nav>
    </aside>
  );
}
