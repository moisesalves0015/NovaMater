import { NavLink } from 'react-router-dom';
import { Home, Calendar, BookOpen, FolderOpen, User } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav() {
  return (
    <div className="bnav-container">
      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`} title="Início">
          <Home size={22} strokeWidth={2.2} />
        </NavLink>
        <NavLink to="/calendario" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`} title="Calendário">
          <Calendar size={22} strokeWidth={2.2} />
        </NavLink>
        <NavLink to="/caderneta" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`} title="Caderneta">
          <BookOpen size={22} strokeWidth={2.2} />
        </NavLink>
        <NavLink to="/documentos" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`} title="Arquivos">
          <FolderOpen size={22} strokeWidth={2.2} />
        </NavLink>
        <NavLink to="/perfil" className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`} title="Perfil">
          <User size={22} strokeWidth={2.2} />
        </NavLink>
      </nav>
    </div>
  );
}
