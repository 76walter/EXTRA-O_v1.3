import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { showToast } from '../components/Toast';

export default function LoginPage() {
    const { login, alterarSenha, user: authUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Controle do fluxo de primeiro acesso / troca obrigatória de senha
    const [exigirTroca, setExigirTroca] = useState(false);
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmaSenha, setConfirmaSenha] = useState('');
    const [showNovaSenha, setShowNovaSenha] = useState(false);

    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        // Se o usuário já está autenticado e NÃO exige troca de senha, redireciona
        if (authUser) {
            if (authUser.trocar_senha) {
                setExigirTroca(true);
            } else {
                navigate(from, { replace: true });
            }
        }
    }, [authUser, navigate, from]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !senha.trim()) {
            setError('Preencha todos os campos.');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const loggedUser = await login(email, senha);
            showToast(`Bem-vindo, ${loggedUser.nome}!`, 'success');
            if (loggedUser.trocar_senha) {
                setExigirTroca(true);
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err.message || 'Erro ao fazer login. Tente novamente.');
            showToast(err.message || 'Erro ao realizar login', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTrocaSenhaSubmit = async (e) => {
        e.preventDefault();
        if (!novaSenha || !confirmaSenha) {
            setError('Preencha os campos de nova senha.');
            return;
        }

        if (novaSenha.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (novaSenha !== confirmaSenha) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Em primeiro login, a senha antiga é a digitada na tela anterior
            await alterarSenha(senha, novaSenha);
            showToast('Senha alterada com sucesso! Bem-vindo ao sistema.', 'success');
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Erro ao alterar a senha.');
            showToast(err.message || 'Erro ao alterar senha', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
            fontFamily: "'Inter', sans-serif",
            padding: '20px'
        }}>
            {/* Background Glows */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0) 70%)',
                top: '10%',
                left: '20%',
                pointerEvents: 'none',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 70%)',
                bottom: '10%',
                right: '20%',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    zIndex: 1,
                    position: 'relative'
                }}
            >
                {/* Logo & Header */}
                <div style={{ textAlign: 'center', marginBottom: '35px' }}>
                    <div style={{ display: 'inline-block', marginBottom: '15px' }}>
                        <img 
                            src="/icone/logo_tela.png" 
                            alt="Logo" 
                            style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
                            onError={(e) => {
                                // Fallback se o ícone não for achado na pasta pública do Vite
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        letterSpacing: '-0.025em',
                        margin: 0
                    }}>
                        {exigirTroca ? 'Trocar Senha' : 'Acessar o Sistema'}
                    </h1>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#94A3B8',
                        marginTop: '8px'
                    }}>
                        {exigirTroca 
                            ? 'Como este é o seu primeiro login, você precisa definir uma nova senha segura.'
                            : 'Gerencie suas extrações e contatos com segurança.'
                        }
                    </p>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#EF4444',
                                fontSize: '0.8rem',
                                marginBottom: '20px',
                                overflow: 'hidden'
                            }}
                        >
                            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Formulários */}
                {!exigirTroca ? (
                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Campo E-mail */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-mail</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seuemail@exemplo.com"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 48px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        color: '#FFFFFF',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="login-input"
                                />
                            </div>
                        </div>

                        {/* Campo Senha */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Senha</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    placeholder="Digite sua senha"
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 48px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        color: '#FFFFFF',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="login-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748B',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Botão Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#2563EB',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#FFFFFF',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                                marginTop: '10px',
                                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)'
                            }}
                            className="login-btn"
                        >
                            {loading ? 'Entrando...' : 'Entrar no Sistema'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleTrocaSenhaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            gap: '10px',
                            color: '#10B981',
                            fontSize: '0.8rem',
                            marginBottom: '5px'
                        }}>
                            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Login aceito! Por segurança, altere sua senha inicial para prosseguir.</span>
                        </div>

                        {/* Nova Senha */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nova Senha</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                <input
                                    type={showNovaSenha ? 'text' : 'password'}
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 48px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        color: '#FFFFFF',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="login-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748B',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar Nova Senha */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmar Nova Senha</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                <input
                                    type="password"
                                    value={confirmaSenha}
                                    onChange={(e) => setConfirmaSenha(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 48px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        color: '#FFFFFF',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="login-input"
                                />
                            </div>
                        </div>

                        {/* Botão Submit Salvar */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#10B981',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#FFFFFF',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                                marginTop: '10px',
                                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            {loading ? 'Salvando...' : 'Salvar Senha & Acessar'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>
                )}
            </motion.div>

            <style>{`
                .login-input:focus {
                    border-color: #2563EB !important;
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                    background: rgba(15, 23, 42, 0.8) !important;
                }
                .login-btn:hover {
                    background: #1D4ED8 !important;
                }
                .login-btn:active {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
}
