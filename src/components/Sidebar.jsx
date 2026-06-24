import React from 'react';
import { Globe, Zap, MessageSquare, PhoneCall, Server, Monitor, LogOut, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/authService';

export default function Sidebar({ status, setStatus, bridgeHealth = {} }) {
  const { user, logout } = useAuth();

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

  const handleAction = async (actionName, endpoint) => {
    setStatus({ text: `🚀 ${actionName}...`, active: true });
    try {
      const res = await apiFetch(endpoint);
      if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus({ text: `❌ Falha: ${data.error || 'Erro na ponte'}`, active: true });
      }
    } catch (e) {
      setStatus({ text: '❌ Erro de conexão com a ponte', active: true });
    }
  };

  const hasAccess = (allowedProfiles) => {
    return user && allowedProfiles.includes(user.perfil);
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Logo */}
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

      {/* Status da Ponte */}
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

      {/* Indicador de Saúde da Ponte */}
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

      {/* Navegação Dinâmica */}
      <motion.nav 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="sidebar-nav"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        <div className="nav-section">
          <motion.span variants={itemVariants} className="nav-label">Ferramentas</motion.span>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => handleAction('Abrindo VTME', '/open-vtme')}
          >
            <Globe size={18} /> Abrir VTME
          </motion.button>
          
          {hasAccess(['ADMIN', 'GERENTE', 'SUPERVISOR']) && (
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="nav-button"
              onClick={() => handleAction('Abrindo App Tim', '/open-tim')}
            >
              <Zap size={18} /> App Tim Vendas
            </motion.button>
          )}
        </div>

        <div className="nav-section">
          <motion.span variants={itemVariants} className="nav-label">Conexão</motion.span>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => handleAction('Abrindo WhatsApp', '/open-whatsapp')}
          >
            <MessageSquare size={18} /> WhatsApp Web
          </motion.button>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="nav-button"
            onClick={() => handleAction('Abrindo 3C Plus', '/open-3c')}
          >
            <PhoneCall size={18} /> 3C Plus
          </motion.button>
        </div>
      </motion.nav>

      {/* Painel do Usuário Logado no Rodapé */}
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '15px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.nome}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user.perfil}
            </span>
          </div>
          <button
            title="Sair do sistema"
            onClick={logout}
            style={{
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#EF4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <LogOut size={14} />
          </button>
        </motion.div>
      )}
    </aside>
  );
}

