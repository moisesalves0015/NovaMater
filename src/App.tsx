// src/App.tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar/Navbar';
import './index.css';

// Lazy-loaded pages
const Landing = lazy(() => import('./pages/Landing/Landing'));
const Login = lazy(() => import('./pages/Auth/Login'));
const AdminLogin = lazy(() => import('./pages/Auth/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const DoctorPanel = lazy(() => import('./pages/Doctor/DoctorPanel'));
const Memorial = lazy(() => import('./pages/Memorial/Memorial'));
const Packages = lazy(() => import('./pages/Packages/Packages'));

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

  // Se for médico tentando acessar a rota protegida do médico, libera o acesso
  if (allowedRoles?.includes('doctor') && (userData?.role === 'doctor' || currentUser.email === 'doutor@novamater.com')) {
    return <>{children}</>;
  }

  // Se a rota for restrita a gestantes e o usuário for médico, leva para o painel médico
  if (userData?.role === 'doctor' && !allowedRoles?.includes('doctor')) {
    return <Navigate to="/medico" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { userData } = useAuth();

  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Rota Inicial e Páginas Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/memorial" element={<Memorial />} />
          <Route path="/pacotes" element={<Packages />} />

          {/* Rota Exclusiva da Mãe / Gestante */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['mother', 'father', 'guest']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Rota Exclusiva do Doutor / Administrador */}
          <Route path="/medico" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorPanel />
            </ProtectedRoute>
          } />

          {/* Fallback de redirecionamento esperto */}
          <Route path="*" element={
            <Navigate to={userData?.role === 'doctor' ? '/medico' : '/dashboard'} replace />
          } />
        </Routes>
      </Suspense>
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
