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
  const [sending, setSending]       = useState(false);
  const sessionEndedRef = useRef(false);

  // Use refs so poll closure always has latest values
  const sessionIdRef   = useRef(null);
  const lastTimeRef    = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef        = useRef(null);
  const chatVolRef     = useRef(null);

  // Fetch volunteers, refresh every 15s
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll — reads from refs so always has latest sessionId
  const poll = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const since = lastTimeRef.current;
      const res = await getChatMessages(sid, since);
      if (res.data.length > 0) {
        lastTimeRef.current = res.data[res.data.length - 1].createdAt;

        // Check for session ended signal
        const endedMsg = res.data.find(m => m.text === '__SESSION_ENDED__');
        if (endedMsg && !sessionEndedRef.current) {
          sessionEndedRef.current = true;
          clearInterval(pollRef.current);
          setMessages(prev => [...prev, {
            _id: 'ended',
            from: 'recv',
            text: '✅ This session has ended. Thank you for reaching out. Take care 💜',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
          return;
        }

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id).filter(Boolean));
          const fresh = res.data
            .filter(m => !existingIds.has(m._id) && m.text !== '__SESSION_ENDED__')
            .map(m => ({
              _id:  m._id,
              from: m.from === 'user' ? 'sent' : 'recv',
              text: m.text,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  const startChat = async (vol) => {
    const userId = user?.id || user?._id || user?.email || 'anon';
    const sid = `${userId}__${vol._id}`; // use __ separator to avoid regex issues

    sessionIdRef.current  = sid;
    chatVolRef.current    = vol;
    lastTimeRef.current   = null;
    sessionEndedRef.current = false;

    setChatVol(vol);
    setChatStart(Date.now());
    setMessages([{ from: 'recv', text: `Hi! I'm ${vol.name}. ${vol.bio || "I'm here to listen."} Take all the time you need — I'm here. 💜`, time: now() }]);

    // Write opening messages to DB
    try {
      await sendChatMessage(sid, {
        text: `Hi! I'm ${vol.name}. ${vol.bio || "I'm here to listen."} Take all the time you need — I'm here. 💜`,
        from: 'mentor', fromName: vol.name,
      });
    } catch (e) { console.error('Failed to write opening msg:', e); }

    // Small delay then fetch all messages from DB to sync
    setTimeout(async () => {
      try {
        await sendChatMessage(sid, {
          text: "What's been on your mind lately? You can start wherever feels comfortable.",
          from: 'mentor', fromName: vol.name,
        });
      } catch {}
    }, 1500);

    // Start polling
    clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 3000);
  };

  const endChat = async (escalated = false) => {
    clearInterval(pollRef.current);
    const sid = sessionIdRef.current;
    const vol = chatVolRef.current;
    if (sid && vol) {
      const duration = Math.round((Date.now() - chatStart) / 60000);
      try { await endChatSession(sid, { mentorName: vol.name, escalated, duration }); } catch (e) { console.error(e); }
    }
    sessionIdRef.current = null;
    chatVolRef.current   = null;
    lastTimeRef.current  = null;
    setChatVol(null);
    setMessages([]);
    setEscalationAlert(false);
  };

  const sendMessage = async () => {
    const sid = sessionIdRef.current;
    if (!input.trim() || !sid || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      await sendChatMessage(sid, { text, from: 'user', fromName: user?.name || 'User' });
      // Poll immediately to show the sent message
      await poll();
    } catch (e) { console.error(e); }
    finally { setSending(false); }

    // High-risk check
    const highRisk = ['suicide','kill myself','end my life','hurt myself','want to die']
      .some(w => text.toLowerCase().includes(w));
    if (highRisk) {
      setTimeout(async () => {
        setEscalationAlert(true);
        const warn = "⚠️ I want to make sure you're getting the best support. There's a licensed therapist available right now. Would that be okay?";
        try {
          await sendChatMessage(sid, { text: warn, from: 'mentor', fromName: chatVolRef.current?.name });
          await poll();
        } catch {}
      }, 1500);
    }
  };

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Cleanup on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger-outline" onClick={() => setEscalationAlert(true)}>⚠️ Escalate to SOS</button>
            <button className="btn btn-ghost-sm" onClick={() => endChat(false)} style={{ fontSize: 13 }}>End Session</button>
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
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            className="chat-input"
            placeholder={sessionEndedRef.current ? 'Session has ended' : 'Type your message...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyUp={e => e.key === 'Enter' && sendMessage()}
            disabled={sending || sessionEndedRef.current}
          />
          {sessionEndedRef.current ? (
            <button className="back-btn" onClick={() => endChat(false)} style={{ whiteSpace: 'nowrap' }}>← Back to Mentors</button>
          ) : (
            <button className="send-btn" onClick={sendMessage} disabled={sending}>
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
            ['⚡', 'Live Chat',          'Messages delivered in real-time — no delays'],
          ].map(([icon, title, sub]) => (
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
              <button className="vol-connect-btn" onClick={() => startChat(v)}>
                Connect with {v.name.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
