import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getVolunteers, getChatMessages, sendChatMessage, endChatSession } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function HelpSection() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [chatVol, setChatVol]       = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [escalationAlert, setEscalationAlert] = useState(false);
  const [chatStart, setChatStart]   = useState(null);
  const [sessionId, setSessionId]   = useState(null);
  const lastMsgTime = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch volunteers and refresh every 15s so status updates show
  const fetchVolunteers = useCallback(async () => {
    try {
      const res = await getVolunteers();
      setVolunteers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchVolunteers();
    const t = setInterval(fetchVolunteers, 15000);
    return () => clearInterval(t);
  }, [fetchVolunteers]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3s when in a chat
  const pollMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const since = lastMsgTime.current;
      const res = await getChatMessages(sessionId, since);
      if (res.data.length > 0) {
        const newMsgs = res.data.map(m => ({
          _id:  m._id,
          from: m.from === 'user' ? 'sent' : 'recv',
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fromName: m.fromName,
        }));
        setMessages(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m._id).filter(Boolean));
          const fresh = newMsgs.filter(m => !existingIds.has(m._id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        lastMsgTime.current = res.data[res.data.length - 1].createdAt;
      }
    } catch (e) { console.error(e); }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(pollMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [sessionId, pollMessages]);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const startChat = async (vol) => {
    const sid = `${user._id || user.id || user.email}-${vol._id}`;
    setChatVol(vol);
    setChatStart(Date.now());
    setSessionId(sid);
    lastMsgTime.current = null;

    // Send opening message from mentor side (simulated — stored in DB)
    const openingText = `Hi! I'm ${vol.name}. ${vol.bio} Take all the time you need — I'm here. 💜`;
    const followText  = "What's been on your mind lately? You can start wherever feels comfortable.";

    try {
      await sendChatMessage(sid, { text: openingText, from: 'mentor', fromName: vol.name });
      setTimeout(async () => {
        await sendChatMessage(sid, { text: followText, from: 'mentor', fromName: vol.name });
      }, 2000);
    } catch (e) { console.error(e); }

    // Load initial messages
    setMessages([
      { from: 'recv', text: openingText, time: now(), fromName: vol.name },
    ]);
    setTimeout(() => {
      setMessages(m => [...m, { from: 'recv', text: followText, time: now(), fromName: vol.name }]);
    }, 2100);
  };

  const endChat = async (escalated = false) => {
    if (sessionId && chatVol) {
      clearInterval(pollRef.current);
      const duration = Math.round((Date.now() - chatStart) / 60000);
      try {
        await endChatSession(sessionId, { mentorName: chatVol.name, escalated, duration });
      } catch (e) { console.error(e); }
    }
    setChatVol(null);
    setSessionId(null);
    setMessages([]);
    setEscalationAlert(false);
    lastMsgTime.current = null;
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    const text = input.trim();
    setInput('');

    // Optimistic UI
    const optimistic = { from: 'sent', text, time: now(), fromName: user?.name };
    setMessages(m => [...m, optimistic]);

    try {
      await sendChatMessage(sessionId, { text, from: 'user', fromName: user?.name || 'User' });
    } catch (e) { console.error(e); }

    // Check high-risk keywords
    const highRisk = ['suicide','kill myself','end my life','hurt myself','want to die'].some(w => text.toLowerCase().includes(w));
    if (highRisk) {
      setTimeout(async () => {
        setEscalationAlert(true);
        const warningText = "⚠️ I want to make sure you're getting the best support. There's a licensed therapist available right now who can help more than I can. Would that be okay?";
        setMessages(m => [...m, { from: 'recv', text: warningText, time: now() }]);
        try { await sendChatMessage(sessionId, { text: warningText, from: 'mentor', fromName: chatVol?.name }); } catch {}
      }, 1500);
    }
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
                {chatVol.status === 'available' ? '🟢 Active · Trained Mentor' : '🟡 Away · may be slow to respond'}
              </div>
            </div>
          </div>
          <button className="btn btn-danger-outline" onClick={() => setEscalationAlert(true)}>⚠️ Escalate to SOS</button>
        </div>

        {escalationAlert && (
          <div className="chat-alert">
            <div className="chat-alert-content"><strong>⚠️ We've noticed signs of escalating distress.</strong> Would you like us to connect you with a licensed therapist?</div>
            <div className="chat-alert-actions">
              <button className="btn btn-danger-sm" onClick={() => endChat(true)}>Yes, Connect Therapist</button>
              <button className="btn btn-ghost-sm" onClick={() => setEscalationAlert(false)}>I'm OK for now</button>
            </div>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={m._id || i} className={`chat-msg ${m.from}`}>
              <div className="msg-bubble">{m.text}</div>
              <div className="msg-time">{m.time}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input className="chat-input" placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyUp={e => e.key === 'Enter' && sendMessage()} />
          <button className="send-btn" onClick={sendMessage}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
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
          {[['🔒','Completely Private','Your conversation stays between you and your mentor'],
            ['🎓','Trained Mentors','All mentors complete NGO-certified peer support training'],
            ['⚡','Live Chat','Messages are delivered in real-time']].map(([icon, title, sub]) => (
            <div key={title} className="help-info-card">
              <span className="hic-icon">{icon}</span>
              <div><div className="hic-title">{title}</div><div className="hic-sub">{sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="volunteer-section-title">Mentors Available Now</h2>
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
                    {v.status === 'available' ? '🟢 Available now' : v.status === 'away' ? '🟡 Away · back soon' : '🔴 Busy'}
                  </div>
                </div>
              </div>
              <div className="vol-specialties">
                {v.specialties.map(s => <span key={s} className="vol-tag">{s}</span>)}
              </div>
              <div className="vol-stats">
                <span>⭐ {v.rating.toFixed(1)}</span>
                <span>💬 {v.sessions} chats</span>
                <span>⚡ {v.responseTime}</span>
              </div>
              <button
                className="vol-connect-btn"
                onClick={() => startChat(v)}
                disabled={v.status === 'busy'}
                style={v.status === 'busy' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                {v.status === 'busy' ? 'Currently Busy' : `Connect with ${v.name.split(' ')[0]}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
