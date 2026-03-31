import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CommunityPage from './pages/CommunityPage';
import HelpPage from './pages/HelpPage';
import ResourcesPage from './pages/ResourcesPage';
import SOSPage from './pages/SOSPage';
import SettingsPage from './pages/SettingsPage';
import MentorDashboard from './pages/MentorDashboard';

function PrivateRoute({ children, volunteerOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-sahara-500">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (volunteerOnly && user.role !== 'volunteer') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-sahara-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/community" element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
        <Route path="/help" element={<PrivateRoute><HelpPage /></PrivateRoute>} />
        <Route path="/resources" element={<PrivateRoute><ResourcesPage /></PrivateRoute>} />
        <Route path="/sos" element={<PrivateRoute><SOSPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/mentor" element={<PrivateRoute volunteerOnly><MentorDashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
