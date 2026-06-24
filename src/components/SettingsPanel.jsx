import React, { useState, useEffect } from 'react';
import { Save, Shield, Settings, Server, RefreshCw } from 'lucide-react';
import { showToast } from './Toast';

export default function SettingsPanel({ setStatus }) {
  const [settings, setSettings] = useState({
    vtmeUser: '',
    vtmePass: '',
    timUser: '',
    dialerUser: '',
    dialerPass: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/settings', { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
      setStatus({ text: '❌ Erro ao buscar configurações', active: true });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatus({ text: '⚙️ Salvando configurações...', active: true });
      const res = await fetch('http://localhost:3001/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        setStatus({ text: '✅ Configurações salvas com sucesso!', active: true });
        showToast('Configurações salvas com sucesso! O robô usará as novas credenciais nas próximas operações.', 'success');
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      setStatus({ text: '❌ Erro ao salvar configurações', active: true });
      showToast('Falha ao salvar configurações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ height: '300px' }}>
        <RefreshCw className="animate-spin" size={24} />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <>
      <div className="header-bar">
        <div className="title-group">
          <Settings className="text-primary" />
          <span className="page-title">Configurações do Robô</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '10px 0' }}>
        <form onSubmit={handleSave} className="wa-list-container" style={{ padding: '24px', gap: '20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '10px' }}>
            <Server size={18} className="text-primary" />
            <strong style={{ fontSize: '0.95rem' }}>Plataforma VTME</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Usuário VTME</label>
              <input
                type="text"
                className="select-custom"
                style={{ width: '100%', height: '40px', backgroundImage: 'none', paddingRight: '15px' }}
                value={settings.vtmeUser}
                onChange={(e) => handleInputChange('vtmeUser', e.target.value)}
                placeholder="Usuário do VTME"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Senha VTME</label>
              <input
                type="password"
                className="select-custom"
                style={{ width: '100%', height: '40px', backgroundImage: 'none', paddingRight: '15px' }}
                value={settings.vtmePass}
                onChange={(e) => handleInputChange('vtmePass', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '20px', marginBottom: '10px' }}>
            <Shield size={18} className="text-primary" />
            <strong style={{ fontSize: '0.95rem' }}>TIM Vendas</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Matrícula TIM (Vendedor)</label>
              <input
                type="text"
                className="select-custom"
                style={{ width: '100%', height: '40px', backgroundImage: 'none', paddingRight: '15px' }}
                value={settings.timUser}
                onChange={(e) => handleInputChange('timUser', e.target.value)}
                placeholder="Número da matrícula do vendedor"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', opacity: 0.7 }}>Usada para preencher automaticamente a tela de seleção de vendedor após o login.</span>
            </div>
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '20px', marginBottom: '10px' }}>
            <Shield size={18} className="text-primary" />
            <strong style={{ fontSize: '0.95rem' }}>Dialer 3C Plus</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Usuário 3C Plus</label>
              <input
                type="text"
                className="select-custom"
                style={{ width: '100%', height: '40px', backgroundImage: 'none', paddingRight: '15px' }}
                value={settings.dialerUser}
                onChange={(e) => handleInputChange('dialerUser', e.target.value)}
                placeholder="Usuário 3C"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Senha 3C Plus</label>
              <input
                type="password"
                className="select-custom"
                style={{ width: '100%', height: '40px', backgroundImage: 'none', paddingRight: '15px' }}
                value={settings.dialerPass}
                onChange={(e) => handleInputChange('dialerPass', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.85rem' }}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        <div className="wa-list-container" style={{ padding: '24px', gap: '15px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <Shield size={18} className="text-primary" />
            <strong style={{ fontSize: '0.95rem' }}>Inovações & Segurança</strong>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p>
              🔐 <strong>Criptografia AES-256-GCM</strong>: As senhas são criptografadas com AES-256-GCM antes de serem salvas no arquivo <code style={{ color: 'var(--primary-hover)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>settings.json</code>. A chave é derivada do hostname da máquina, impedindo que o arquivo seja copiado e lido em outro computador.
            </p>
            <p>
              🤖 <strong>Auto-Preenchimento Adaptativo</strong>: O robô Playwright lê e decripta as credenciais automaticamente em tempo real. Se precisar mudar a sua senha em qualquer portal, basta atualizá-la aqui e salvar. Não é necessário mexer nos arquivos do sistema.
            </p>
            <p>
              🛡️ <strong>Segurança Local</strong>: Apenas esta aplicação, nesta máquina, consegue decriptar as senhas. Mesmo que alguém copie o arquivo, não conseguirá ler as credenciais sem a chave do seu computador.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
