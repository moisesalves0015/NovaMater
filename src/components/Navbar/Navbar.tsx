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
import {
  Bell, LogIn, LogOut, LayoutDashboard,
  User, Flower2, ChevronDown, Stethoscope,
  Home, Package, Calendar, Users, X,
  Lock
} from 'lucide-react';
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

function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  const handleMarkRead = async (notifId: string) => {
    try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } catch {}
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e2e8f0',
          background: '#fff', position: 'relative',
        }}
        onClick={() => setOpen(!open)}
        aria-label="Notificações"
      >
        <Bell size={18} color="#64748b" strokeWidth={2} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#c9195a', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: '0.62rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="profile-popover"
            style={{ width: '300px', right: '-80px', padding: 0, overflow: 'hidden' }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>Notificações</h4>
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.75rem', background: '#fdf2f8', color: '#be185d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {unreadCount} novas
                </span>
              )}
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
                    onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                      background: n.read ? '#fff' : '#fdf2f8',
                      cursor: n.read ? 'default' : 'pointer',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem' }}>{n.icon || '•'}</div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>{n.title}</h5>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{n.body}</p>
                      <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9195a', marginTop: '6px', flexShrink: 0 }} />}
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

const PUBLIC_NAV_LINKS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/pacotes', label: 'Pacotes & Certidões', icon: Package },
  { to: '/calendario', label: 'Agendamentos', icon: Calendar },
  { to: '/memorial', label: 'Mural de Nascimentos', icon: Users },
];

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

  const isDoctor = userData?.role === 'doctor' || userData?.role === 'admin';

  return (
    <header className={`modern-navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="modern-navbar" style={{ width: '100%' }}>
          {/* LOGO */}
          <Link to="/" className="nav-logo">
            <div className="logo-sparkle">
              <Flower2 size={26} color="#c9195a" strokeWidth={1.5} />
            </div>
            <div className="logo-brand">
              <span className="logo-title">Nova<span className="gradient-txt">Mater</span></span>
              <span className="logo-sub">SYSTEM IMVU</span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="nav-menu-desktop">
            {PUBLIC_NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`nav-item ${location.pathname === to ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="nav-actions-desktop">
            {userData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Notification Bell — only for mothers/fathers */}
                {(userData.role === 'mother' || userData.role === 'father') && (
                  <NotificationBell userId={userData.uid} />
                )}
                <div className="user-profile-wrapper" onClick={() => setProfileDropdown(!profileDropdown)}>
                  <div className="user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDoctor
                      ? <Stethoscope size={16} color="#fff" strokeWidth={2} />
                      : <User size={16} color="#fff" strokeWidth={2} />
                    }
                  </div>
                  <div className="user-details">
                    <span className="user-name">{userData.name ? userData.name.split(' ')[0] : 'Usuário'}</span>
                    <span className="user-badge">{isDoctor ? 'Médico' : 'Família'}</span>
                  </div>
                  <ChevronDown size={14} color="#94a3b8" strokeWidth={2.5} />

                  <AnimatePresence>
                    {profileDropdown && (
                      <motion.div
                        className="profile-popover"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      >
                        <Link to={isDoctor ? '/admin' : '/dashboard'} className="popover-item">
                          <LayoutDashboard size={15} /> {isDoctor ? 'Painel Hospitalar' : 'Minha Gestação'}
                        </Link>
                        {!isDoctor && (
                          <Link to="/perfil" className="popover-item">
                            <User size={15} /> Meu Perfil
                          </Link>
                        )}
                        {!isDoctor && (
                          <Link to="/perfil" className="popover-item">
                            <Lock size={15} /> Alterar Senha
                          </Link>
                        )}
                        <div className="popover-divider" />
                        <button onClick={handleLogout} className="popover-item danger">
                          <LogOut size={15} /> Sair da Conta
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="auth-btn-group">
                <Link to="/login" className="btn-modern btn-modern-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LogIn size={16} strokeWidth={2} /> Entrar no Sistema
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
              className="mobile-drawer-content"
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
                <button className="close-btn" onClick={() => setMobileOpen(false)}>
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="drawer-links">
                {PUBLIC_NAV_LINKS.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="drawer-item">
                    <Icon size={18} strokeWidth={2} /> {label}
                  </Link>
                ))}
                {userData ? (
                  <>
                    <Link to={isDoctor ? '/admin' : '/dashboard'} className="drawer-item highlight">
                      <LayoutDashboard size={18} strokeWidth={2} /> Meu Painel
                    </Link>
                    {!isDoctor && (
                      <Link to="/perfil" className="drawer-item">
                        <User size={18} strokeWidth={2} /> Meu Perfil
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="drawer-item"
                      style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', color: '#dc2626', background: '#fff0f3' }}
                    >
                      <LogOut size={18} strokeWidth={2} /> Sair da Conta
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="btn-modern btn-modern-primary style-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LogIn size={18} strokeWidth={2} /> Entrar no Sistema
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
