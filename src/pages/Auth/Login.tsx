// src/pages/Auth/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Erro ao acessar o prontuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      setError('Erro ao acessar com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card glass-box"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-logo">
          <Link to="/">
            <span className="logo-icon">🌸</span>
            <span className="logo-text">Nova<span className="logo-accent">Mater</span></span>
          </Link>
        </div>

        <h1 className="auth-title">Acesso da Paciente</h1>
        <p className="auth-desc">Digite o e-mail e senha cadastrados pelo hospital</p>

        {error && (
          <motion.div className="auth-error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            ⚠️ {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-modern btn-modern-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? '⏳ Acessando...' : '✨ Acessar Prontuário'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color, #eee)' }} />
          <span style={{ padding: '0 10px', color: 'var(--txt-muted)', fontSize: '0.9rem' }}>ou</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color, #eee)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn-modern btn-modern-light"
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
          Acessar com o Google
        </button>

        <div className="auth-info-note" style={{ textAlign: 'center', marginTop: 16 }}>
          🔒 <strong>Nota:</strong> O seu e-mail e senha de acesso são fornecidos pelo médico responsável durante a consulta.
        </div>
      </motion.div>
    </div>
  );
}
