// src/App.tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar/Navbar';
import BottomNav from './components/BottomNav/BottomNav';
import './index.css';

// Lazy-loaded pages
const Landing = lazy(() => import('./pages/Landing/Landing'));
const Login = lazy(() => import('./pages/Auth/Login'));
const AdminLogin = lazy(() => import('./pages/Auth/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const DoctorPanel = lazy(() => import('./pages/Doctor/DoctorPanel'));
const MedicalRecord = lazy(() => import('./pages/Doctor/MedicalRecord'));
const Memorial = lazy(() => import('./pages/Memorial/Memorial'));
const Packages = lazy(() => import('./pages/Packages/Packages'));
const CalendarPage = lazy(() => import('./pages/Calendar/CalendarPage'));
const BookletPage = lazy(() => import('./pages/Booklet/BookletPage'));
const DocumentsPage = lazy(() => import('./pages/Documents/DocumentsPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      background: 'var(--bg-main)',
      color: 'var(--txt-medium)',
      fontSize: '1rem',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🌸</div>
      <p>Carregando NovaMater System...</p>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;

  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || ''];
  const isStaff = userRoles.some(r => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r)) || currentUser.email === 'doutor@novamater.com';

  if (isStaff && allowedRoles?.some(role => ['doctor', 'admin', 'nurse', 'receptionist'].includes(role))) {
    return <>{children}</>;
  }

  if (isStaff && !allowedRoles?.some(role => ['doctor', 'admin', 'nurse', 'receptionist'].includes(role))) {
    return <Navigate to="/admin" replace />;
  }

  const hasAccess = !allowedRoles || allowedRoles.some(role => userRoles.includes(role));
  if (!hasAccess) {
    return <Navigate to={isStaff ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { userData, currentUser } = useAuth();
  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || ''];
  const isAdminFlow = userRoles.some((r: any) => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r));
  const isAuth = !!currentUser;

  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Rota Inicial e Páginas Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/memorial" element={<Memorial />} />
          <Route path="/pacotes" element={<Packages />} />

          {/* Rota Exclusiva da Mãe / Gestante */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/calendario" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest']}>
              <CalendarPage />
            </ProtectedRoute>
          } />

          <Route path="/caderneta" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest']}>
              <BookletPage />
            </ProtectedRoute>
          } />

          <Route path="/documentos" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest']}>
              <DocumentsPage />
            </ProtectedRoute>
          } />

          <Route path="/perfil" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest', 'doctor', 'admin', 'nurse', 'receptionist']}>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Rota Exclusiva do Administrador do Hospital */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin', 'nurse', 'receptionist']}>
              <DoctorPanel />
            </ProtectedRoute>
          } />

          <Route path="/prontuario/:id" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin', 'nurse', 'receptionist']}>
              <MedicalRecord />
            </ProtectedRoute>
          } />

          {/* Fallback de redirecionamento esperto */}
          <Route path="*" element={
            <Navigate to={isAdminFlow ? '/admin' : '/dashboard'} replace />
          } />
        </Routes>
      </Suspense>
      {isAuth && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
