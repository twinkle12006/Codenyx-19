import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import MentorDashboard from './components/MentorDashboard';
import AdminDashboard from './components/AdminDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : children;
}

// Routes to the correct dashboard based on role
function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin')  return <AdminDashboard />;
  if (user.role === 'mentor') return <MentorDashboard />;
  return <Dashboard />;
}

function AppWithSocket({ children }) {
  const { token } = useAuth();
  return <SocketProvider token={token}>{children}</SocketProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="ambient-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      <AppWithSocket>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><AuthScreen /></PublicRoute>} />
            {/* Role-based: mentor/admin get their own UI, users get Dashboard */}
            <Route path="/:section" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AppWithSocket>
    </AuthProvider>
  );
}
