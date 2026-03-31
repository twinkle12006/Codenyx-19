import React, { useState, useEffect, useRef } from 'react';
import { getClinics, bookClinic, getAvailableDoctors } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function SosSection() {
  const { user }              = useAuth();
  const { socket, connected } = useSocket();

  const [clinics, setClinics]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [booked, setBooked]     = useState({});
  const [doctors, setDoctors]   = useState([]);
  const [activeDoctor, setActiveDoctor] = useState(null);

  // Chat state
  const [inChat, setInChat]         = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const sessionIdRef   = useRef(null);
  const typingTimer    = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchClinics = async () => {
    try { const r = await getClinics(); setClinics(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClinics(); }, []);
  useEffect(() => { const t = setInterval(fetchClinics, 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    getAvailableDoctors().then(r => {
      setDoctors(r.data);
      if (r.data.length > 0) setActiveDoctor(r.data[0]);
    }).catch(() => {});
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) => {
      if (msg.sessionId !== sessionIdRef.current) return;
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, {
          _id: msg._id,
          from: msg.from === 'user' ? 'sent' : 'recv',
          text: msg.text,
          time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];
      });
    };
    const onTyping = ({ isTyping }) => {
      setTyping(isTyping);
      if (isTyping) { clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 3000); }
    };
    const onEnded = () => {
      setSessionEnded(true);
      setMessages(prev => [...prev, { _id: 'ended', from: 'recv', text: '✅ Session ended. You are not alone — reach out anytime. 💜', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    };
    socket.on('new_message',   onMessage);
    socket.on('typing',        onTyping);
    socket.on('session_ended', onEnded);
    return () => { socket.off('new_message', onMessage); socket.off('typing', onTyping); socket.off('session_ended', onEnded); };
  }, [socket]);

  const startCrisisChat = () => {
    if (!socket || !connected) { alert('Connecting to crisis support, please try again in a moment.'); return; }
    const userId = user?.id;
    if (!userId) { alert('Please log in to access crisis support.'); return; }
    const doctor = activeDoctor || { name: 'Dr. Ananya', bio: "I'm a licensed crisis therapist. You're safe here." };
    setConnecting(true);
    setTimeout(() => {
      const sid = `${userId}__sos_${Date.now()}`;
      sessionIdRef.current = sid;
      socket.emit('join_session', sid);
      setMessages([{
        _id: 'welcome',
        from: 'recv',
        text: `Hi, I'm ${doctor.name}. ${doctor.bio || "I'm here to help."} What's going on right now?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setInChat(true);
      setConnecting(false);
      setSessionEnded(false);
    }, 1800);
  };

  const endChat = () => {
    if (sessionIdRef.current && socket) socket.emit('leave_session', sessionIdRef.current);
    sessionIdRef.current = null;
    setInChat(false);
    setMessages([]);
    setSessionEnded(false);
    setTyping(false);
    setInput('');
  };

  const sendMessage = () => {
    const sid = sessionIdRef.current;
    if (!input.trim() || !sid || !socket || sessionEnded) return;
    const text = input.trim();
    setInput('');
    socket.emit('send_message', { sessionId: sid, text, from: 'user', fromName: user?.name || 'User' });
    socket.emit('typing', { sessionId: sid, isTyping: false });
    clearTimeout(typingTimer.current);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const sid = sessionIdRef.current;
    if (!sid || !socket) return;
    socket.emit('typing', { sessionId: sid, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { sessionId: sid, isTyping: false }), 2000);
  };

  const handleBook = async (id, e) => {
    e.stopPropagation();
    try { await bookClinic(id); setBooked(b => ({ ...b, [id]: true })); fetchClinics(); }
    catch (e) { alert(e.response?.data?.message || 'Booking failed'); }
  };

  // ── Chat view ──────────────────────────────────────────────────────────────
  if (inChat || connecting) {
    return (
      <section className="section active">
        <div className="chat-header" style={{ borderBottom: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
          <button className="back-btn" onClick={endChat}>← Back</button>
          <div className="chat-partner-info">
            <div className="chat-avatar" style={{ background: '#f43f5e', fontSize: 14 }}>{(activeDoctor?.name || 'Dr. Ananya').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div>
              <div className="chat-partner-name">{activeDoctor?.name || 'Dr. Ananya'}</div>
              <div className="chat-partner-status" style={{ color: '#fca5a5' }}>
                {connecting ? '⏳ Connecting...' : sessionEnded ? '⚫ Session ended' : '🔴 Crisis Support · Licensed Therapist'}
              </div>
            </div>
          </div>
          {!sessionEnded && !connecting && (
            <button className="btn btn-ghost-sm" onClick={endChat} style={{ fontSize: 13 }}>End Session</button>
          )}
        </div>

        {connecting ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
            <div style={{ fontSize: 48 }}>🆘</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fca5a5' }}>Connecting to crisis support...</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>A licensed therapist will be with you shortly</div>
          </div>
        ) : (
          <>
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={m._id || i} className={`chat-msg ${m.from}`}>
                  <div className="msg-bubble" style={m.from === 'recv' ? { borderLeft: '2px solid #f43f5e' } : {}}>{m.text}</div>
                  <div className="msg-time">{m.time}</div>
                </div>
              ))}
              {typing && (
                <div className="chat-typing">
                  <div className="typing-bubble"><span></span><span></span><span></span></div>
                  <small>{(activeDoctor?.name || 'Dr. Ananya').split(' ')[0]} is typing...</small>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input className="chat-input"
                placeholder={sessionEnded ? 'Session has ended' : 'Type your message...'}
                value={input}
                onChange={handleInputChange}
                onKeyUp={e => e.key === 'Enter' && sendMessage()}
                disabled={sessionEnded}
              />
              {sessionEnded ? (
                <button className="back-btn" onClick={endChat}>← Back</button>
              ) : (
                <button className="send-btn" onClick={sendMessage}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              )}
            </div>
          </>
        )}
      </section>
    );
  }

  // ── Default SOS view ───────────────────────────────────────────────────────
  return (
    <section className="section active" id="section-sos">
      <div className="sos-header">
        <div className="sos-header-content">
          <div className="sos-pulse-ring">🆘</div>
          <div>
            <h1 className="sh-title">SOS Crisis Support</h1>
            <p className="sh-subtitle">Immediate access to licensed therapists and emergency clinic slots.</p>
          </div>
        </div>
      </div>

      <div className="crisis-zone">
        <div className="crisis-btn-wrap">
          {/* Doctor card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'white', flexShrink: 0 }}>
              {(activeDoctor?.name || 'Dr. Ananya').split(' ').map(w=>w[0]).join('').slice(0,2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{activeDoctor?.name || 'Dr. Ananya'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {activeDoctor?.qualification || 'Licensed Crisis Therapist'} · {activeDoctor?.experience || 0} yrs · {activeDoctor?.casesResolved || 0} cases resolved
              </div>
              <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 4, fontStyle: 'italic' }}>
                "{activeDoctor?.bio || "I'm here to help. You're safe."}"
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
              <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>Online</span>
            </div>
          </div>

          <button
            className="crisis-btn activated"
            onClick={startCrisisChat}
            disabled={!connected}
            style={{ width: '100%', cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.6 }}
          >
            <div className="crisis-btn-inner">
              <span className="crisis-btn-icon">🤝</span>
              <span className="crisis-btn-text">Connect to {activeDoctor?.name || 'Dr. Ananya'} Now</span>
              <span className="crisis-btn-sub">{connected ? 'Average wait: ~90 seconds' : 'Connecting to server...'}</span>
            </div>
          </button>
        </div>

      </div>
    </section>
  );
}
