// src/components/Navbar/Navbar.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/usePregnancy';
import './Navbar.css';

function NotificationBell({ userId }: { userId: string }) {
  const { unreadCount } = useNotifications(userId);
  if (unreadCount === 0) return null;
  return (
    <div style={{ position: 'relative', cursor: 'pointer' }}>
      <span style={{ fontSize: '1.2rem' }}>🔔</span>
      <span style={{
        position: 'absolute', top: -6, right: -6,
        background: 'var(--accent-pink)',
        color: '#fff',
        borderRadius: '50%',
        width: 18, height: 18,
        fontSize: '0.65rem',
        fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid #fff',
      }}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </div>
  );
}



export default function Navbar() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileDropdown(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={`modern-navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="modern-navbar glass-box" style={{ width: '100%' }}>
          {/* LOGO */}
          <Link to="/" className="nav-logo">
            <div className="logo-sparkle">🌸</div>
            <div className="logo-brand">
              <span className="logo-title">Nova<span className="gradient-txt">Mater</span></span>
              <span className="logo-sub">SYSTEM IMVU</span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="nav-menu-desktop">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              Início
            </Link>
            <Link to="/pacotes" className={`nav-item ${location.pathname === '/pacotes' ? 'active' : ''}`}>
              Pacotes & Certidões
            </Link>
            <Link to="/agendamentos" className={`nav-item ${location.pathname === '/agendamentos' ? 'active' : ''}`}>
              Agendamentos
            </Link>
            <Link to="/memorial" className={`nav-item ${location.pathname === '/memorial' ? 'active' : ''}`}>
              Mural de Nascimentos
            </Link>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="nav-actions-desktop">
            {userData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Notification Bell — only for mothers */}
                {(userData.role === 'mother' || userData.role === 'father') && (
                  <NotificationBell userId={userData.uid} />
                )}
                <div className="user-profile-wrapper" onClick={() => setProfileDropdown(!profileDropdown)}>
                  <div className="user-avatar">
                    {userData.role === 'doctor' ? '👨‍⚕️' : '🤰'}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{userData.name ? userData.name.split(' ')[0] : 'Usuário'}</span>
                    <span className="user-badge">{userData.role === 'doctor' ? 'Médico' : 'Família'}</span>
                  </div>
                  <span className="user-arrow">▾</span>

                  <AnimatePresence>
                    {profileDropdown && (
                      <motion.div
                        className="profile-popover glass-box"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      >
                        <Link to={(userData.role === 'doctor' || userData.role === 'admin') ? '/admin' : '/dashboard'} className="popover-item">
                          📊 {userData.role === 'doctor' ? 'Painel Hospitalar' : 'Minha Gestação'}
                        </Link>
                        <button onClick={handleLogout} className="popover-item danger">
                          🚪 Sair da Conta
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="auth-btn-group">
                <Link to="/login" className="btn-modern btn-modern-primary">
                  🔑 Entrar no Sistema
                </Link>
              </div>
            )}
          </div>

          {/* HAMBURGER MOBILE TOGGLE */}
          <button
            className={`mobile-toggle-btn ${mobileOpen ? 'is-active' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir Menu Mobile"
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>
        </nav>

      {/* MOBILE DRAWER MODAL */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className="mobile-drawer-content glass-box"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="drawer-header">
                <div className="logo-brand">
                  <span className="logo-title">Nova<span className="gradient-txt">Mater</span></span>
                </div>
                <button className="close-btn" onClick={() => setMobileOpen(false)}>✕</button>
              </div>

              <div className="drawer-links">
                <Link to="/" className="drawer-item">🌸 Início</Link>
                <Link to="/pacotes" className="drawer-item">📜 Pacotes & Certidões</Link>
                <Link to="/agendamentos" className="drawer-item">📅 Agendamentos</Link>
                <Link to="/memorial" className="drawer-item">👶 Mural de Nascimentos</Link>
                {userData ? (
                  <Link to={(userData.role === 'doctor' || userData.role === 'admin') ? '/admin' : '/dashboard'} className="drawer-item highlight">
                    📊 Meu Painel
                  </Link>
                ) : (
                  <Link to="/login" className="btn-modern btn-modern-primary style-full">
                    🔑 Entrar no Sistema
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
