import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, FolderOpen, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './BottomNav.css';

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Início' },
  { to: '/calendario', icon: Calendar, label: 'Agenda' },
  { to: '/caderneta', icon: BookOpen, label: 'Caderneta' },
  { to: '/documentos', icon: FolderOpen, label: 'Arquivos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: Home, label: 'Início' },
  { to: '/admin?tab=appointments', icon: Calendar, label: 'Agenda' },
  { to: '#', icon: BookOpen, label: 'Caderneta', disabled: true },
  { to: '/admin?tab=patients', icon: FolderOpen, label: 'Arquivos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const location = useLocation();
  const { userData } = useAuth();

  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || ''];
  const isDoctor = userRoles.some(r => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r));
  const items = isDoctor ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  return (
    <div className="bnav-container">
      <nav className="bottom-nav">
        {items.map(({ to, icon: Icon, label, disabled }) => {
          if (disabled) {
            return (
              <button
                key={label}
                onClick={(e) => {
                  e.preventDefault();
                  alert("Acesso restrito às gestantes. Em breve novidades para administradores.");
                }}
                className="bnav-item"
                style={{ opacity: 0.5, cursor: 'not-allowed', border: 'none', background: 'transparent' }}
                title={label}
              >
                <Icon size={22} strokeWidth={2.2} />
                <span className="bnav-label">{label}</span>
              </button>
            );
          }

          const isItemActive = (() => {
            if (isDoctor) {
              const tab = new URLSearchParams(location.search).get('tab');
              if (to === '/admin') {
                return location.pathname === '/admin' && (!tab || tab === 'new' || tab === 'ultrasound' || tab === 'users');
              }
              if (to === '/admin?tab=appointments') {
                return location.pathname === '/admin' && tab === 'appointments';
              }
              if (to === '/admin?tab=patients') {
                return location.pathname === '/admin' && tab === 'patients';
              }
              if (to === '/perfil') {
                return location.pathname === '/perfil';
              }
              return false;
            } else {
              return location.pathname === to || location.pathname.startsWith(to + '/');
            }
          })();

          return (
            <Link
              key={to}
              to={to}
              className={`bnav-item ${isItemActive ? 'active' : ''}`}
              title={label}
            >
              <Icon size={22} strokeWidth={2.2} />
              <span className="bnav-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
