import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, FolderOpen, User } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: Home, label: 'Início' },
  { to: '/calendario', icon: Calendar, label: 'Agenda' },
  { to: '/caderneta', icon: BookOpen, label: 'Caderneta' },
  { to: '/documentos', icon: FolderOpen, label: 'Arquivos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="bnav-container">
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              className={`bnav-item ${isActive ? 'active' : ''}`}
              title={label}
            >
              <Icon size={22} strokeWidth={2.2} />
              <span className="bnav-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
