// src/pages/Auth/AdminLogin.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function AdminLogin() {
  const { loginAsDoctor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('doutor@novamater.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAsDoctor(email, password);
      // Redireciona EXCLUSIVAMENTE para a rota do Painel do Doutor / Administrador
      navigate('/medico');
    } catch {
      setError('Erro ao autenticar administrador.');
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
            <span className="logo-icon">👨‍⚕️</span>
            <span className="logo-text">Painel<span className="logo-accent">Médico</span></span>
          </Link>
        </div>

        <h1 className="auth-title">Acesso Administrativo</h1>
        <p className="auth-desc">Rota exclusiva do Doutor / Administrador do Hospital</p>

        {error && (
          <motion.div className="auth-error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            ⚠️ {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">E-mail Administrativo</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-modern btn-modern-dark"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? '⏳ Acessando...' : '🔑 Entrar no Painel Médico (/medico)'}
          </button>
        </form>

        <div className="auth-info-note" style={{ textAlign: 'center', marginTop: 12 }}>
          ⚙️ <strong>Credenciais do Administrador:</strong><br />
          <code>doutor@novamater.com</code> | <code>123456</code>
        </div>
      </motion.div>
    </div>
  );
}
