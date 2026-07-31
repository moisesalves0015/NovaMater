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
  Home, Package, Calendar, Users,
  Lock, X, ArrowRight, Sparkles, FileText
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

function getNotificationIcon(type: string, nativeIcon?: string) {
  if (type === 'gestational_month' || nativeIcon === '👶') {
    return <Sparkles size={16} color="var(--accent-pink)" />;
  }
  if (type === 'documento' || type === 'exame' || nativeIcon === '📄') {
    return <FileText size={16} color="#3b82f6" />;
  }
  if (type === 'consulta' || type === 'agendamento' || nativeIcon === '🗓️') {
    return <Calendar size={16} color="#10b981" />;
  }
  return <Bell size={16} color="#64748b" />;
}

function NotificationBell({ userId, isOpen, setIsOpen }: { userId: string, isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const { notifications, unreadCount } = useNotifications(userId);
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMarkRead = async (notifId: string) => {
    try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } catch {}
  };

  const handleClearAll = async () => {
    try {
      const { writeBatch, collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  };

  const checkResourceExists = async (n: any) => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const lowerTitle = (n.title || '').toLowerCase();
      const lowerBody = (n.body || '').toLowerCase();
      const type = n.type || '';

      // 1. Check for documents
      if (n.link?.includes('/documentos') || type.includes('documento') || lowerTitle.includes('documento')) {
        const q = query(collection(db, 'documents'), where('pregnancyId', '==', n.pregnancyId));
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => doc.data());
        
        const exists = docs.some(d => {
          const name = (d.name || d.title || '').toLowerCase();
          return name && (lowerBody.includes(name) || lowerTitle.includes(name));
        });
        
        if (!exists && docs.length > 0) {
          return { exists: false, message: "Documento não encontrado." };
        }
        if (docs.length === 0) {
          return { exists: false, message: "Documento não encontrado." };
        }
      }
      
      // 2. Check for exams
      if (type.includes('exame') || lowerTitle.includes('exame') || lowerBody.includes('exame')) {
        const q = query(collection(db, 'exams'), where('pregnancyId', '==', n.pregnancyId));
        const snap = await getDocs(q);
        const examsList = snap.docs.map(doc => doc.data());
        
        const exists = examsList.some(e => {
          const name = (e.name || e.type || '').toLowerCase();
          return name && (lowerBody.includes(name) || lowerTitle.includes(name));
        });
        
        if (!exists) {
          return { exists: false, message: "Exame apagado." };
        }
      }
      
      // 3. Check for consultations
      if (n.link?.includes('/calendario') || type.includes('consulta') || lowerTitle.includes('consulta') || lowerBody.includes('consulta')) {
        const q = query(collection(db, 'consultations'), where('pregnancyId', '==', n.pregnancyId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          return { exists: false, message: "Consulta excluída." };
        }
      }
      
      // 4. Check for ultrasounds
      if (type.includes('ultrassom') || lowerTitle.includes('ultrassom')) {
        const q = query(collection(db, 'ultrasounds'), where('pregnancyId', '==', n.pregnancyId));
        const snap = await getDocs(q);
        if (snap.empty) {
          return { exists: false, message: "Exame apagado." };
        }
      }
    } catch (err) {
      console.error("Erro ao verificar destino:", err);
    }
    return { exists: true };
  };

  const handleCardClick = async (n: any) => {
    // If no link, or link is dashboard/root (placeholder), treat as having no destination
    if (!n.link || n.link === '/dashboard' || n.link === '/') {
      setErrorMsg("Destino não encontrado ou indisponível.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    // Check if resource still exists in Firestore
    const check = await checkResourceExists(n);
    if (!check.exists) {
      setErrorMsg(check.message || "Destino não encontrado ou indisponível.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    if (!n.read) await handleMarkRead(n.id);
    
    const target = n.link;
    const pathOnly = target.split('?')[0];
    const knownRoutes = ['/documentos', '/calendario', '/caderneta', '/perfil', '/memorial', '/pacotes', '/admin'];
    
    if (!knownRoutes.includes(pathOnly)) {
      setErrorMsg("Destino não encontrado ou indisponível.");
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setIsOpen(false);
      navigate(target);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="user-profile-wrapper notification-bell-wrapper"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
      >
        <div className="user-avatar bell-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Bell size={16} color="#fff" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="notification-badge-circle">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="user-details-desktop">
          <span className="user-name">Notificações</span>
          <span className="user-badge">{unreadCount > 0 ? `${unreadCount} não lidas` : 'Nenhuma não lida'}</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              className="notification-backdrop-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Popover */}
            <motion.div
              className="notification-popover"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            >
              <div className="notification-popover-header">
                <h4>Notificações</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {unreadCount > 0 && (
                    <span className="badge-total">
                      {unreadCount} novas
                    </span>
                  )}
                  {notifications.length > 0 && (
                    <button className="popover-clear-btn" onClick={handleClearAll} title="Limpar tudo">
                      Limpar
                    </button>
                  )}
                  <button className="popover-close-btn" onClick={() => setIsOpen(false)} aria-label="Fechar">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="notification-error-banner">
                  <span>{errorMsg}</span>
                  <button className="error-banner-close" onClick={() => setErrorMsg(null)} aria-label="Fechar mensagem de erro">
                    <X size={12} />
                  </button>
                </div>
              )}
              
              <div className="notification-list-container">
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n: any) => {
                    const hasDestination = n.link && n.link !== '/dashboard' && n.link !== '/';
                    return (
                      <div
                        key={n.id}
                        className={`notification-item-card ${n.read ? 'is-read' : 'is-unread'} ${!hasDestination ? 'no-action' : ''}`}
                        onClick={() => {
                          if (hasDestination) {
                            handleCardClick(n);
                          } else if (!n.read) {
                            handleMarkRead(n.id);
                          }
                        }}
                      >
                        <div className="notification-card-header">
                          <span className="notification-card-icon">{getNotificationIcon(n.type, n.icon)}</span>
                          <div className="notification-card-details">
                            <span className="notification-card-title">{n.title}</span>
                            <span className="notification-card-time">{timeAgo(n.createdAt)}</span>
                          </div>
                          
                          {hasDestination && (
                            <button
                              className="notification-card-action-circle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(n);
                              }}
                              title={n.link === '/documentos' ? 'Ver Documentos' :
                                     n.link === '/calendario' ? 'Acessar Agenda' :
                                     n.link === '/caderneta' ? 'Abrir Caderneta' :
                                     'Acessar Detalhes'}
                            >
                              <ArrowRight size={14} color="#fff" />
                            </button>
                          )}
                          
                          {!n.read && <span className="unread-dot" />}
                        </div>
                        
                        <p className="notification-card-body">{n.body}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Informative Footer Banner */}
              <div className="notification-popover-banner">
                <div className="banner-badge">Parceria IR3h Store</div>
                <h5 className="banner-title">Gravidez Completa</h5>
                <p className="banner-desc">Compre moedas no jogo e tenha a gestação mais realista no IMVU!</p>
              </div>
            </motion.div>
          </>
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
  const { userData, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProfileDropdown(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdmin = userData?.role === 'admin' || currentUser?.email === 'doutor@novamater.com';
  const isStaff = userData?.role === 'doctor' || userData?.role === 'admin' || userData?.role === 'nurse' || userData?.role === 'receptionist';

  return (
    <header className={`modern-navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="modern-navbar" style={{ width: '100%' }}>
        {/* LEFT AREA (Notification Bell, Desktop Menu Links) */}
        <div className="nav-area-left">
          {userData && (
            <NotificationBell 
              userId={userData.uid} 
              isOpen={notificationsOpen} 
              setIsOpen={(val) => {
                setNotificationsOpen(val);
                if (val) setProfileDropdown(false);
              }}
            />
          )}

          {/* Desktop nav links — hidden when logged in */}
          <div className="nav-menu-desktop">
            {!userData && PUBLIC_NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`nav-item ${location.pathname === to ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* CENTER AREA (Logo Centered) */}
        <div className="nav-area-center">
          <Link to="/" className="nav-logo">
            <div className="logo-sparkle">
              <Flower2 size={34} color="#d94b88" strokeWidth={1.5} />
            </div>
            <div className="logo-brand">
              <span className="logo-title">Nova<span className="gradient-txt">Mater</span></span>
              <span className="logo-sub">Hospital Maternidade</span>
            </div>
          </Link>
        </div>

        {/* RIGHT AREA (Profile Avatar / Actions / Login) */}
        <div className="nav-area-right">
          {userData ? (
            <div className="nav-user-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="user-profile-wrapper" onClick={() => { setProfileDropdown(!profileDropdown); setNotificationsOpen(false); }}>
                <div className="user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isStaff
                    ? <Stethoscope size={16} color="#fff" strokeWidth={2} />
                    : <User size={16} color="#fff" strokeWidth={2} />
                  }
                </div>
                <div className="user-details-desktop">
                  <span className="user-name">{userData.name ? userData.name.split(' ')[0] : 'Usuário'}</span>
                  <span className="user-badge">{isStaff ? 'Equipe' : 'Família'}</span>
                </div>
                <ChevronDown size={14} color="#94a3b8" strokeWidth={2.5} className="user-arrow-desktop" />

                <AnimatePresence>
                  {profileDropdown && (
                    <motion.div
                      className="profile-popover"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                      <Link to={isAdmin ? '/admin' : '/dashboard'} className="popover-item">
                        <LayoutDashboard size={15} /> {isAdmin ? 'Painel Hospitalar' : 'Minha Gestação'}
                      </Link>
                      {!isAdmin && (
                        <Link to="/perfil" className="popover-item">
                          <User size={15} /> Meu Perfil
                        </Link>
                      )}
                      {!isAdmin && (
                        <Link to="/perfil" className="popover-item">
                          <Lock size={15} /> Alterar Senha
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/dashboard" className="popover-item">
                          <User size={15} /> Minha Gestação
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
              <Link to="/login" className="btn-modern btn-modern-primary btn-login-desktop" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogIn size={16} strokeWidth={2} /> Entrar no Sistema
              </Link>
              <Link to="/login" className="btn-login-mobile" aria-label="Entrar">
                <LogIn size={20} color="var(--accent-pink)" strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
