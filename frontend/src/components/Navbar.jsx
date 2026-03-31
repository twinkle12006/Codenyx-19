import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const links = user.role === 'volunteer'
    ? [{ to: '/mentor', label: 'Dashboard' }, { to: '/resources', label: 'Resources' }, { to: '/settings', label: 'Settings' }]
    : [
        { to: '/', label: 'Home' },
        { to: '/community', label: 'Community' },
        { to: '/help', label: 'Get Help' },
        { to: '/resources', label: 'Resources' },
        { to: '/sos', label: 'SOS' },
        { to: '/settings', label: 'Settings' }
      ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-white shadow-sm border-b border-sahara-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="text-2xl font-bold text-sahara-600 tracking-tight">🌵 Sahara</Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`text-sm font-medium transition-colors ${location.pathname === l.to ? 'text-sahara-600' : 'text-gray-500 hover:text-sahara-500'}`}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs bg-sahara-100 text-sahara-700 px-2 py-1 rounded-full font-mono">
              {user.anonymousUsername}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-gray-500" onClick={() => setOpen(!open)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-sahara-100 px-4 py-3 flex flex-col gap-3">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`text-sm font-medium ${location.pathname === l.to ? 'text-sahara-600' : 'text-gray-500'}`}>
              {l.label}
            </Link>
          ))}
          <span className="text-xs font-mono text-sahara-600">{user.anonymousUsername}</span>
          <button onClick={handleLogout} className="text-sm text-red-400 text-left">Logout</button>
        </div>
      )}
    </nav>
  );
}
