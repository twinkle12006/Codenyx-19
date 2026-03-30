import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStats } from '../api/auth';

import HomeSection from './sections/HomeSection';
import VentSection from './sections/VentSection';
import HelpSection from './sections/HelpSection';
import SosSection  from './sections/SosSection';
import CardSection from './sections/CardSection';
import JournalSection from './sections/JournalSection';

const VALID_SECTIONS = ['home', 'vent', 'help', 'sos', 'card', 'journal'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { section = 'home' } = useParams();
  const navigate = useNavigate();
  const activeSection = VALID_SECTIONS.includes(section) ? section : 'home';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, icon: '💜', message: `Welcome back, ${user?.name?.split(' ')[0]}!`, time: 'just now' },
  ]);
  const [stats, setStats]         = useState({ users: 0, volunteers: 0, slots: 0, ventsToday: 0 });
  const [tickerMsgs, setTickerMsgs] = useState(['💜 MindBridge is live — you are not alone']);

  const navTo = (s) => {
    navigate(`/${s}`);
    setDropdownOpen(false);
    setNotifOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live stats + dynamic ticker
  useEffect(() => {
    const fetchAndUpdate = async () => {
      try {
        const res = await getStats();
        const s = res.data;
        setStats(s);
        setTickerMsgs([
          `👥 ${s.users} registered users on MindBridge`,
          `🤝 ${s.volunteers} volunteers available right now`,
          `🏥 ${s.slots} emergency clinic slots open`,
          `💬 ${s.ventsToday} vents posted today`,
          `💜 You are not alone — the community is here`,
          `🌱 Every step forward counts, no matter how small`,
          `🆘 Crisis support available 24/7 — tap SOS anytime`,
        ]);
        if (s.ventsToday > 0) {
          setNotifications(n => {
            const exists = n.find(x => x.icon === '💬');
            const msg = { id: Date.now(), icon: '💬', message: `${s.ventsToday} vents posted today — community is active`, time: 'just now' };
            return exists ? n.map(x => x.icon === '💬' ? msg : x) : [msg, ...n.slice(0, 9)];
          });
        }
      } catch (e) { console.error(e); }
    };
    fetchAndUpdate();
    const t = setInterval(fetchAndUpdate, 20000);
    return () => clearInterval(t);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setDropdownOpen(false); setNotifOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => navTo('home')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">🧠</div>
          <span className="brand-name">Mind<span className="brand-accent">Bridge</span></span>
        </div>

        <div className="nav-links" id="navLinks">
          {[['home','Home'],['vent','Vent Mode'],['help','I Need Help'],['sos','🆘 SOS'],['card','💳 Health Card'],['journal','📔 Journal']].map(([key, label]) => (
            <button key={key}
              className={`nav-btn${activeSection === key ? ' active' : ''}${key === 'sos' ? ' sos-nav-btn' : ''}`}
              onClick={e => { e.stopPropagation(); navTo(key); }}>
              {key === 'vent' && <span className="nav-dot vent-dot"></span>}
              {key === 'help' && <span className="nav-dot help-dot"></span>}
              {label}
            </button>
          ))}
        </div>

        <div className="nav-status">
          <div className="status-pill">
            <span className="pulse-dot"></span>
            <span>{stats.users || '...'}</span> users
          </div>
        </div>

        {/* Notification Bell */}
        <div className="notif-wrap" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button className="notif-bell" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifications.length > 0 && (
              <span className="notif-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
            )}
          </button>
          {notifOpen && (
            <div className="notif-panel open">
              <div className="notif-panel-header">
                <span>🔔 Live Activity</span>
                <button className="notif-clear-btn" onClick={() => setNotifications([])}>Clear all</button>
              </div>
              <div className="notif-list">
                {notifications.length === 0
                  ? <div className="notif-empty">No new notifications</div>
                  : notifications.map(n => (
                    <div key={n.id} className="notif-item">
                      <span className="notif-icon">{n.icon}</span>
                      <div className="notif-body">
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="nav-user" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <div className="nav-avatar" onClick={() => setDropdownOpen(o => !o)}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {dropdownOpen && (
            <div className="user-dropdown open">
              <div className="ud-header">
                <div className="ud-name">{user?.name}</div>
                <div className="ud-email">{user?.email}</div>
              </div>
              <button className="ud-item" onClick={() => navTo('card')}>💳 My Health Card</button>
              <button className="ud-item" onClick={() => navTo('home')}>🏠 Home</button>
              <div className="ud-divider"></div>
              <button className="ud-item ud-logout" onClick={logout}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </nav>

      {/* Live Activity Ticker */}
      <div className="activity-ticker">
        <div className="ticker-inner">
          <span className="ticker-label">LIVE</span>
          <div className="ticker-track-wrap">
            <div className="ticker-track">
              {[...tickerMsgs, ...tickerMsgs].map((m, i) => (
                <span key={i} className="ticker-item">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="app-container">
        {activeSection === 'home'    && <HomeSection navTo={navTo} />}
        {activeSection === 'vent'    && <VentSection navTo={navTo} />}
        {activeSection === 'help'    && <HelpSection />}
        {activeSection === 'sos'     && <SosSection />}
        {activeSection === 'card'    && <CardSection user={user} />}
        {activeSection === 'journal' && <JournalSection user={user} />}
      </main>
    </>
  );
}
