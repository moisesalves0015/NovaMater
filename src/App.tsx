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
  // Only strict admin role (not doctor/nurse) triggers admin-only redirection
  const isAdmin = userRoles.some(r => ['admin'].includes(r)) || currentUser.email === 'doutor@novamater.com';
  // Staff can access admin panel but are NOT forcibly redirected away from patient routes
  const isStaff = userRoles.some(r => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r));

  // Admin-only portal: redirect non-admins trying to reach /admin
  if (allowedRoles?.every(role => ['doctor', 'admin', 'nurse', 'receptionist'].includes(role))) {
    if (!isStaff) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  }

  // Patient portal: admins with no linked pregnancy get sent to /admin;
  // doctors who are also gestantes can access patient routes
  const hasAccess = !allowedRoles || allowedRoles.some(role => userRoles.includes(role));
  if (!hasAccess) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { userData, currentUser } = useAuth();
  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || ''];
  // Only strict admin redirects to /admin on unknown routes
  const isAdminFlow = userRoles.some((r: any) => ['admin'].includes(r)) || currentUser?.email === 'doutor@novamater.com';
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

          {/* Rota da Gestante — também acessível a médicas gestantes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest', 'doctor']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/calendario" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest', 'doctor']}>
              <CalendarPage />
            </ProtectedRoute>
          } />

          <Route path="/caderneta" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest', 'doctor']}>
              <BookletPage />
            </ProtectedRoute>
          } />

          <Route path="/documentos" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest', 'doctor']}>
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
