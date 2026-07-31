// src/pages/Auth/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, Sparkles } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  
  // Toggle between login and registration (cadastro)
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const role = 'mother';
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering) {
      // Sign Up flow
      if (!name || !email || !password) {
        setError('Por favor, preencha todos os campos.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      setLoading(true);
      try {
        await register(email, password, name, role);
        navigate('/onboarding');
      } catch (err: any) {
        console.error('Registration error detail:', err);
        if (err.code === 'auth/email-already-in-use') {
          setError('Este e-mail já está em uso.');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login flow
      if (!email || !password) {
        setError('Por favor, preencha o e-mail e a senha.');
        return;
      }
      setLoading(true);
      try {
        await login(email, password);
        // Check if onboarding completed
        const hasCompleted = localStorage.getItem('hasCompletedOnboarding');
        if (hasCompleted === 'true') {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      } catch {
        setError('Erro ao acessar o prontuário. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      const hasCompleted = localStorage.getItem('hasCompletedOnboarding');
      if (hasCompleted === 'true') {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch {
      setError('Erro ao acessar com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow"></div>
      <motion.div
        className="auth-card glass-box"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-logo">
          <Link to="/">
            <Sparkles className="logo-spark-icon" />
            <span className="logo-text">Nova<span className="logo-accent">Mater</span></span>
          </Link>
        </div>

        <h1 className="auth-title">
          {isRegistering ? 'Criar Nova Conta' : 'Acesso da Paciente'}
        </h1>
        <p className="auth-desc">
          {isRegistering 
            ? 'Preencha os dados abaixo para se cadastrar' 
            : 'Digite o e-mail e senha cadastrados para acessar seu painel'}
        </p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              className="auth-error" 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  id="signup-name"
                  type="text"
                  className="form-input"
                  placeholder="Nome da mãe ou acompanhante"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>



          <button
            id="auth-submit"
            type="submit"
            className="btn-modern btn-modern-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading 
              ? '⏳ Processando...' 
              : isRegistering ? 'Criar Conta e Continuar' : 'Acessar Prontuário'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
          <span style={{ padding: '0 10px', color: 'var(--txt-muted)', fontSize: '0.85rem' }}>ou</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn-modern btn-modern-secondary"
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
          Acessar com o Google
        </button>

        <div className="auth-switch">
          {isRegistering ? (
            <span>
              Já possui cadastro?{' '}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => { setIsRegistering(false); setError(''); }}
              >
                Entre aqui
              </button>
            </span>
          ) : (
            <span>
              Ainda não tem conta?{' '}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => { setIsRegistering(true); setError(''); }}
              >
                Cadastre-se agora
              </button>
            </span>
          )}
        </div>

        <div className="auth-info-note">
          <Lock size={14} style={{ flexShrink: 0, color: 'var(--accent-gold)' }} />
          <span>
            <strong>Nota de Privacidade:</strong> O Nova Mater garante o sigilo total e proteção em conformidade com as diretrizes médicas sobre os prontuários das gestantes.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
