import React, { useState, useEffect, useRef } from 'react';
import { getVolunteers } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function HelpSection() {
  const { user }           = useAuth();
  const { socket, connected } = useSocket();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [chatVol, setChatVol]       = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState(false);   // mentor is typing
  const [typingTimer, setTypingTimer] = useState(null);
  const [escalationAlert, setEscalationAlert] = useState(false);
  const [sessionEnded, setSessionEnded]       = useState(false);
  const [chatStart, setChatStart]   = useState(null);
  const sessionIdRef   = useRef(null);
  const chatVolRef     = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch volunteers, refresh every 15s
  useEffect(() => {
    const fetch = async () => {
      try { const r = await getVolunteers(); setVolunteers(r.data); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
    const t = setInterval(fetch, 15000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Socket event listeners — set up once, read sessionId from ref
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.sessionId !== sessionIdRef.current) return;
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, {
          _id:  msg._id,
          from: msg.from === 'user' ? 'sent' : 'recv',
          text: msg.text,
          time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];
      });
    };

    const onTyping = ({ name, isTyping }) => {
      if (name !== chatVolRef.current?.name) return;
      setTyping(isTyping);
    };

    const onSessionEnded = () => {
      setSessionEnded(true);
      setMessages(prev => [...prev, {
        _id: 'ended', from: 'recv',
        text: '✅ Session ended. Thank you for reaching out. Take care 💜',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    };

    socket.on('new_message',   onMessage);
    socket.on('typing',        onTyping);
    socket.on('session_ended', onSessionEnded);

    return () => {
      socket.off('new_message',   onMessage);
      socket.off('typing',        onTyping);
      socket.off('session_ended', onSessionEnded);
    };
  }, [socket]);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const startChat = (vol) => {
    if (!socket || !connected) {
      alert('Chat is connecting, please try again in a moment.');
      return;
    }
    const userId = user?.id || user?._id || user?.email || 'anon';
    const sid    = `${userId}__${vol._id}`;

    sessionIdRef.current = sid;
    chatVolRef.current   = vol;

    setChatVol(vol);
    setChatStart(Date.now());
    setMessages([]);
    setSessionEnded(false);
    setTyping(false);

    socket.emit('join_session', sid);

    // Send opening messages via socket
    socket.emit('send_message', {
      sessionId: sid,
      text:      `Hi! I'm ${vol.name}. ${vol.bio || "I'm here to listen."} Take all the time you need — I'm here. 💜`,
      from:      'mentor',
      fromName:  vol.name,
    });
    setTimeout(() => {
      socket.emit('send_message', {
        sessionId: sid,
        text:      "What's been on your mind lately? You can start wherever feels comfortable.",
        from:      'mentor',
        fromName:  vol.name,
      });
    }, 1500);
  };

  const endChat = async (escalated = false) => {
    const sid = sessionIdRef.current;
    const vol = chatVolRef.current;
    if (sid && vol && socket && !sessionEnded) {
      const duration = Math.round((Date.now() - chatStart) / 60000);
      socket.emit('end_session', { sessionId: sid, mentorName: vol.name, escalated, duration });
    }
    if (sid && socket) socket.emit('leave_session', sid);
    sessionIdRef.current = null;
    chatVolRef.current   = null;
    setChatVol(null);
    setMessages([]);
    setSessionEnded(false);
    setEscalationAlert(false);
    setTyping(false);
  };

  const sendMessage = () => {
    const sid = sessionIdRef.current;
    if (!input.trim() || !sid || !socket || sessionEnded) return;
    const text = input.trim();
    setInput('');

    socket.emit('send_message', {
      sessionId: sid,
      text,
      from:     'user',
      fromName: user?.name || 'User',
    });

    // Stop typing indicator
    socket.emit('typing', { sessionId: sid, isTyping: false });
    clearTimeout(typingTimer);

    // High-risk check
    const highRisk = ['suicide','kill myself','end my life','hurt myself','want to die']
      .some(w => text.toLowerCase().includes(w));
    if (highRisk) {
      setTimeout(() => {
        setEscalationAlert(true);
        socket.emit('send_message', {
          sessionId: sid,
          text:      "⚠️ I want to make sure you're getting the best support. There's a licensed therapist available right now. Would that be okay?",
          from:      'mentor',
          fromName:  chatVolRef.current?.name,
        });
      }, 1500);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const sid = sessionIdRef.current;
    if (!sid || !socket) return;
    socket.emit('typing', { sessionId: sid, isTyping: true });
    clearTimeout(typingTimer);
    setTypingTimer(setTimeout(() => {
      socket.emit('typing', { sessionId: sid, isTyping: false });
    }, 2000));
  };

  if (chatVol) {
    return (
      <section className="section active">
        <div className="chat-header">
          <button className="back-btn" onClick={() => endChat(false)}>← Back</button>
          <div className="chat-partner-info">
            <div className="chat-avatar" style={{ background: chatVol.color }}>{chatVol.initials}</div>
            <div>
              <div className="chat-partner-name">{chatVol.name}</div>
              <div className="chat-partner-status">
                {sessionEnded ? '⚫ Session ended' : chatVol.status === 'available' ? '🟢 Active · Trained Mentor' : '🟡 Away'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!sessionEnded && (
              <button className="btn btn-danger-outline" onClick={() => setEscalationAlert(true)}>⚠️ Escalate to SOS</button>
            )}
            {!sessionEnded && (
              <button className="btn btn-ghost-sm" onClick={() => endChat(false)} style={{ fontSize: 13 }}>End Session</button>
            )}
          </div>
        </div>

        {escalationAlert && (
          <div className="chat-alert">
            <div className="chat-alert-content">
              <strong>⚠️ We've noticed signs of escalating distress.</strong> Would you like us to connect you with a licensed therapist?
            </div>
            <div className="chat-alert-actions">
              <button className="btn btn-danger-sm" onClick={() => endChat(true)}>Yes, Connect Therapist</button>
              <button className="btn btn-ghost-sm" onClick={() => setEscalationAlert(false)}>I'm OK for now</button>
            </div>
          </div>
        )}

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>
              Connecting... 💜
            </div>
          )}
          {messages.map((m, i) => (
            <div key={m._id || i} className={`chat-msg ${m.from}`}>
              <div className="msg-bubble">{m.text}</div>
              <div className="msg-time">{m.time}</div>
            </div>
          ))}
          {typing && (
            <div className="chat-typing">
              <div className="typing-bubble"><span></span><span></span><span></span></div>
              <small>{chatVol.name.split(' ')[0]} is typing...</small>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            className="chat-input"
            placeholder={sessionEnded ? 'Session has ended' : 'Type your message...'}
            value={input}
            onChange={handleInputChange}
            onKeyUp={e => e.key === 'Enter' && sendMessage()}
            disabled={sessionEnded}
          />
          {sessionEnded ? (
            <button className="back-btn" onClick={() => endChat(false)} style={{ whiteSpace: 'nowrap' }}>← Back</button>
          ) : (
            <button className="send-btn" onClick={sendMessage}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="section active" id="section-help">
      <div className="section-header">
        <div className="section-header-content">
          <div className="sh-icon help-icon-bg">🤝</div>
          <div>
            <h1 className="sh-title">I Need Help</h1>
            <p className="sh-subtitle">Connect privately with a trained mentor — real support, real humans.</p>
          </div>
        </div>
      </div>

      <div className="help-intro">
        <div className="help-intro-cards">
          {[
            ['🔒', 'Completely Private', 'Your conversation stays between you and your mentor'],
            ['🎓', 'Trained Mentors',    'All mentors complete NGO-certified peer support training'],
            ['⚡', 'Real-time Chat',     'Instant messaging powered by Socket.io'],
          ].map(([icon, title, sub]) => (
            <div key={title} className="help-info-card">
              <span className="hic-icon">{icon}</span>
              <div><div className="hic-title">{title}</div><div className="hic-sub">{sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="volunteer-section-title">Mentors Available Now</h2>
      {!connected && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: 13, color: '#fcd34d' }}>
          ⏳ Connecting to chat server...
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading mentors...</div>
      ) : volunteers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
          No mentors available right now. Please check back soon.
        </div>
      ) : (
        <div className="volunteer-grid">
          {volunteers.map(v => (
            <div key={v._id} className="volunteer-card">
              <div className="vol-header">
                <div className="vol-avatar" style={{ background: v.color }}>{v.initials}</div>
                <div>
                  <div className="vol-name">{v.name}</div>
                  <div className={`vol-status${v.status !== 'available' ? ' away' : ''}`}>
                    {v.status === 'available' ? '🟢 Available now' : '🟡 Away · back soon'}
                  </div>
                </div>
              </div>
              <div className="vol-specialties">
                {(v.specialties || []).map(s => <span key={s} className="vol-tag">{s}</span>)}
              </div>
              <div className="vol-stats">
                <span>⭐ {v.rating?.toFixed(1)}</span>
                <span>💬 {v.sessions} chats</span>
                <span>⚡ {v.responseTime}</span>
              </div>
              <button className="vol-connect-btn" onClick={() => startChat(v)} disabled={!connected}>
                {connected ? `Connect with ${v.name.split(' ')[0]}` : 'Connecting...'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
