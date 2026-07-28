// src/components/Navbar/Navbar.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications, toDate } from '../../hooks/usePregnancy';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Navbar.css';

function timeAgo(date: any): string {
  if (!date) return '';
  const d = toDate(date);
  const diff = (new Date().getTime() - d.getTime()) / 1000;
  if (diff < 60)     return 'agora mesmo';
  if (diff < 3600)   return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}
import './Navbar.css';

function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  const handleMarkRead = async (notifId: string) => {
    try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } catch {}
  };

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        {unreadCount > 0 && (
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
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="profile-popover glass-box"
            style={{ width: '300px', right: '-80px', padding: 0, overflow: 'hidden' }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>Notificações</h4>
              {unreadCount > 0 && <span style={{ fontSize: '0.75rem', background: '#fdf2f8', color: '#be185d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{unreadCount} novas</span>}
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Nenhuma notificação no momento.
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) handleMarkRead(n.id);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      background: n.read ? '#fff' : '#f0f9ff',
                      cursor: n.read ? 'default' : 'pointer',
                      display: 'flex', gap: '12px', alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem' }}>{n.icon || '📋'}</div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#0f172a' }}>{n.title}</h5>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{n.body}</p>
                      <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: '6px' }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
