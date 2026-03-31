import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { loginUser, registerUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'https://codenyx-19.onrender.com';
const THERAPIST  = { name: 'Dr. Ananya', initials: 'DA', color: '#f43f5e' };

function EmergencyChat({ onClose }) {
  const [messages, setMessages]   = useState([{
    _id: 'w', from: 'recv',
    text: "Hi, I'm Dr. Ananya — a licensed crisis therapist. You don't need to sign in. I'm here right now. What's going on?",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput]         = useState('');
  const [typing, setTyping]       = useState(false);
  const [ended, setEnded]         = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef    = useRef(null);
  const sessionRef   = useRef(`anon_${Date.now()}__sos`);
  const typingTimer  = useRef(null);
  const endRef       = useRef(null);

  useEffect(() => {
    // Connect without a token — anonymous emergency access
    const s = io(SOCKET_URL, { auth: {}, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.on('connect', () => { setConnected(true); s.emit('join_session', sessionRef.current); });
    s.on('new_message', (msg) => {
      if (msg.sessionId !== sessionRef.current) return;
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, {
        _id: msg._id, from: msg.from === 'user' ? 'sent' : 'recv',
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    });
    s.on('typing', ({ isTyping }) => {
      setTyping(isTyping);
      if (isTyping) { clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 3000); }
    });
    s.on('session_ended', () => {
      setEnded(true);
      setMessages(prev => [...prev, { _id: 'end', from: 'recv', text: '✅ Session ended. You are not alone — reach out anytime. 💜', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    });
    return () => s.disconnect();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const send = () => {
    const s = socketRef.current;
    if (!input.trim() || !s || ended) return;
    const text = input.trim();
    setInput('');
    s.emit('send_message', { sessionId: sessionRef.current, text, from: 'user', fromName: 'Anonymous' });
    s.emit('typing', { sessionId: sessionRef.current, isTyping: false });
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const s = socketRef.current;
    if (!s) return;
    s.emit('typing', { sessionId: sessionRef.current, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => s.emit('typing', { sessionId: sessionRef.current, isTyping: false }), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0d0d1a', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 20, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(244,63,94,0.06)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: THERAPIST.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 13, flexShrink: 0 }}>{THERAPIST.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{THERAPIST.name}</div>
            <div style={{ fontSize: 12, color: '#fca5a5' }}>{connected ? '🔴 Crisis Support · No login required' : '⏳ Connecting...'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={m._id || i} style={{ display: 'flex', justifyContent: m.from === 'sent' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{ padding: '10px 14px', borderRadius: m.from === 'sent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.from === 'sent' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.07)', color: 'white', fontSize: 14, lineHeight: 1.5, borderLeft: m.from === 'recv' ? '2px solid #f43f5e' : 'none' }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3, textAlign: m.from === 'sent' ? 'right' : 'left' }}>{m.time}</div>
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3, padding: '8px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 12 }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', animation: `bounce 1s ${i*0.2}s infinite` }} />)}
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{THERAPIST.name} is typing...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <input
            value={input} onChange={handleInput}
            onKeyUp={e => e.key === 'Enter' && send()}
            placeholder={ended ? 'Session ended' : 'Type your message...'}
            disabled={ended}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, outline: 'none' }}
          />
          {ended ? (
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: 13 }}>Close</button>
          ) : (
            <button onClick={send} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#f43f5e', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          )}
        </div>


      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab] = useState('signin');
  const [showSOS, setShowSOS] = useState(false);

  // Sign-in state
  const [siLogin, setSiLogin]       = useState(''); // username or email
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError]       = useState('');
  const [siLoading, setSiLoading]   = useState(false);
  const [showSiPw, setShowSiPw]     = useState(false);

  // Sign-up state
  const [suName, setSuName]         = useState('');
  const [suUsername, setSuUsername] = useState('');
  const [suUsernameStatus, setSuUsernameStatus] = useState(''); // '', 'checking', 'available', 'taken'
  const [suAge, setSuAge]           = useState('');
  const [suEmail, setSuEmail]       = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConsent, setSuConsent]   = useState(false);
  const [suError, setSuError]       = useState('');
  const [suLoading, setSuLoading]   = useState(false);
  const [showSuPw, setShowSuPw]     = useState(false);
  const [pwStrength, setPwStrength] = useState({ width: '0%', color: '#f43f5e' });

  const checkPassword = (val) => {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    const widths = ['0%', '25%', '50%', '75%', '100%'];
    const colors = ['#f43f5e', '#f43f5e', '#f59e0b', '#22c55e', '#22c55e'];
    setPwStrength({ width: widths[s], color: colors[s] });
  };

  // Check username availability with debounce
  let usernameTimer = null;
  const handleUsernameChange = (val) => {
    setSuUsername(val);
    setSuUsernameStatus('');
    clearTimeout(usernameTimer);
    if (!val || val.length < 3) return;
    if (!/^[a-z0-9_]{3,20}$/i.test(val)) {
      setSuUsernameStatus('invalid');
      return;
    }
    setSuUsernameStatus('checking');
    usernameTimer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/auth/check-username/${val.toLowerCase()}`);
        const data = await res.json();
        setSuUsernameStatus(data.available ? 'available' : 'taken');
      } catch { setSuUsernameStatus(''); }
    }, 500);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSiError('');
    setSiLoading(true);
    try {
      // Backend expects { login, password } where login = username or email
      const res = await loginUser({ login: siLogin, password: siPassword });
      login(res.data.user, res.data.token);
      const role = res.data.user?.role;
      navigate(role === 'mentor' || role === 'admin' ? '/dashboard' : '/home', { replace: true });
    } catch (err) {
      setSiError('⚠ ' + (err.response?.data?.message || 'Login failed'));
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSuError('');
    if (!suUsername) { setSuError('⚠ Username is required.'); return; }
    if (!/^[a-z0-9_]{3,20}$/i.test(suUsername)) { setSuError('⚠ Username: 3–20 chars, letters/numbers/underscore only.'); return; }
    if (suUsernameStatus === 'taken') { setSuError('⚠ That username is already taken.'); return; }
    if (!suConsent) { setSuError('⚠ Please accept the privacy policy.'); return; }
    setSuLoading(true);
    try {
      const res = await registerUser({
        name:     suName,
        username: suUsername.toLowerCase(),
        email:    suEmail,
        password: suPassword,
        age:      suAge ? parseInt(suAge) : 0,
        role:     'user',
      });
      login(res.data.user, res.data.token);
      navigate('/home', { replace: true });
    } catch (err) {
      setSuError('⚠ ' + (err.response?.data?.message || 'Registration failed'));
    } finally {
      setSuLoading(false);
    }
  };

  const usernameHint = () => {
    if (suUsernameStatus === 'checking') return { color: 'var(--text-dim)', text: '⏳ Checking...' };
    if (suUsernameStatus === 'available') return { color: '#86efac', text: '✓ Available' };
    if (suUsernameStatus === 'taken')    return { color: '#fca5a5', text: '✗ Already taken' };
    if (suUsernameStatus === 'invalid')  return { color: '#fcd34d', text: '⚠ 3–20 chars, letters/numbers/underscore' };
    return null;
  };

  return (
    <div className="auth-screen" style={{ display: 'flex' }}>
      {showSOS && <EmergencyChat onClose={() => setShowSOS(false)} />}

      {/* SOS floating button */}
      <button
        onClick={() => setShowSOS(true)}
        style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 400, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(244,63,94,0.5)', animation: 'pulse 2s infinite' }}
      >
        🆘 Emergency Support
      </button>
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">🧠</div>
          <span className="auth-brand-name">Sah<span className="brand-accent">ara</span></span>
        </div>
        <h1 className="auth-tagline">You Are <span className="gradient-text">Never</span><br />Alone Here.</h1>
        <p className="auth-desc">A safe, stepped-care mental health ecosystem — connecting youth with community peers, trained volunteers, and licensed crisis therapists.</p>
        <div className="auth-pillars">
          <div className="auth-pillar"><span className="ap-icon">🌊</span><div><div className="ap-title">Community</div><div className="ap-sub">Anonymous community support</div></div></div>
          <div className="auth-pillar"><span className="ap-icon">🤝</span><div><div className="ap-title">I Need Help</div><div className="ap-sub">Volunteer-led peer conversations</div></div></div>
          <div className="auth-pillar"><span className="ap-icon">🆘</span><div><div className="ap-title">SOS Crisis</div><div className="ap-sub">Professional crisis intervention</div></div></div>
        </div>
        <div className="auth-trust">
          <div className="trust-badge">🔒 Your data is private &amp; secure</div>
          <div className="trust-badge">🌱 NGO-backed &amp; non-profit</div>
          <div className="trust-badge">💜 No judgment, ever</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => { setTab('signin'); setSiError(''); setSuError(''); }}>Sign In</button>
            <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setSiError(''); setSuError(''); }}>Create Account</button>
          </div>

          {/* ── Sign In ── */}
          {tab === 'signin' && (
            <form className="auth-form" onSubmit={handleSignIn}>
              <div className="auth-welcome">
                <div className="auth-welcome-icon">👋</div>
                <div className="auth-welcome-title">Welcome back</div>
                <div className="auth-welcome-sub">Sign in with your username</div>
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrap">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="your_username"
                    required
                    value={siLogin}
                    onChange={e => setSiLogin(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔑</span>
                  <input
                    type={showSiPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    required
                    value={siPassword}
                    onChange={e => setSiPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button type="button" className="toggle-pw" onClick={() => setShowSiPw(p => !p)}>
                    {showSiPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {siError && <div className="form-error">{siError}</div>}
              <button type="submit" className="auth-submit-btn" disabled={siLoading}>
                <span className="btn-text">{siLoading ? '⏳ Signing in...' : 'Sign In'}</span>
              </button>
            </form>
          )}

          {/* ── Sign Up ── */}
          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignUp}>
              <div className="auth-welcome">
                <div className="auth-welcome-icon">🌱</div>
                <div className="auth-welcome-title">Create your safe space</div>
                <div className="auth-welcome-sub">Your identity stays private. Always.</div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input type="text" className="form-input" placeholder="Alex" required value={suName} onChange={e => setSuName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-input" placeholder="18" min="1" max="99" required value={suAge} onChange={e => setSuAge(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrap">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="quietstar_42"
                    required
                    value={suUsername}
                    onChange={e => handleUsernameChange(e.target.value)}
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                {usernameHint() && (
                  <div style={{ fontSize: 12, marginTop: 4, color: usernameHint().color }}>{usernameHint().text}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="input-wrap">
                  <span className="input-icon">✉️</span>
                  <input type="email" className="form-input" placeholder="you@example.com" required value={suEmail} onChange={e => setSuEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Create password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔑</span>
                  <input
                    type={showSuPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 8 characters"
                    required
                    minLength="8"
                    value={suPassword}
                    onChange={e => { setSuPassword(e.target.value); checkPassword(e.target.value); }}
                    autoComplete="new-password"
                  />
                  <button type="button" className="toggle-pw" onClick={() => setShowSuPw(p => !p)}>
                    {showSuPw ? '🙈' : '👁'}
                  </button>
                </div>
                <div className="pw-strength">
                  <div className="pw-bar" style={{ width: pwStrength.width, background: pwStrength.color }}></div>
                </div>
              </div>

              <div className="form-group">
                <label className="consent-label">
                  <input type="checkbox" checked={suConsent} onChange={e => setSuConsent(e.target.checked)} />
                  <span>I agree to the <button type="button" className="auth-link" style={{ background:'none', border:'none', padding:0, cursor:'pointer', font:'inherit' }}>Privacy Policy</button> &amp; understand my data is securely protected</span>
                </label>
              </div>

              {suError && <div className="form-error">{suError}</div>}
              <button type="submit" className="auth-submit-btn" disabled={suLoading || suUsernameStatus === 'taken' || suUsernameStatus === 'checking'}>
                <span className="btn-text">{suLoading ? '⏳ Creating account...' : 'Create Account'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
