import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMentorMe, updateMentorMe, getMentorSessions, getChatMessages, sendChatMessage, getMentorActiveChats, endChatSession } from '../api/auth';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_OPTIONS = ['available', 'away'];
const STATUS_COLORS  = { available: '#22c55e', away: '#f59e0b' };
const STATUS_LABELS  = { available: '🟢 Available', away: '🟡 Away' };

export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState('overview');
  const [profile, setProfile]   = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Active live chats
  const [activeChats, setActiveChats]   = useState([]); // sessionIds with recent messages
  const [openChat, setOpenChat]         = useState(null); // { sessionId, userName }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const lastMsgTime = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Edit state
  const [editBio, setEditBio]               = useState('');
  const [editStatus, setEditStatus]         = useState('available');
  const [editSpecialties, setEditSpecialties] = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saveMsg, setSaveMsg]               = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([getMentorMe(), getMentorSessions()]);
      setProfile(pRes.data);
      setSessions(sRes.data);
      setEditBio(pRes.data.bio || '');
      setEditStatus(pRes.data.status || 'available');
      setEditSpecialties((pRes.data.specialties || []).join(', '));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll for active chats (sessions with messages in last 30 min)
  const pollActiveChats = useCallback(async () => {
    try {
      const res = await getMentorActiveChats();
      setActiveChats(res.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    pollActiveChats();
    const t = setInterval(pollActiveChats, 8000);
    return () => clearInterval(t);
  }, [pollActiveChats]);

  // Poll messages for open chat — use a ref to avoid stale closure
  const openChatRef = useRef(null);

  const pollChatMessages = useCallback(async () => {
    const chat = openChatRef.current;
    if (!chat) return;
    try {
      const since = lastMsgTime.current;
      const res = await getChatMessages(chat.sessionId, since);
      if (res.data.length > 0) {
        lastMsgTime.current = res.data[res.data.length - 1].createdAt;
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id).filter(Boolean));
          const fresh = res.data
            .filter(m => !existingIds.has(m._id))
            .map(m => ({
              _id: m._id,
              from: m.from === 'mentor' ? 'sent' : 'recv',
              text: m.text,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  // Start polling once on mount
  useEffect(() => {
    pollRef.current = setInterval(pollChatMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [pollChatMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const openChatSession = async (sessionId, userName) => {
    const chat = { sessionId, userName };
    openChatRef.current  = chat;
    lastMsgTime.current  = null;
    setOpenChat(chat);
    setChatMessages([]);
    try {
      const res = await getChatMessages(sessionId, null);
      const msgs = res.data.map(m => ({
        _id: m._id,
        from: m.from === 'mentor' ? 'sent' : 'recv',
        text: m.text,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setChatMessages(msgs);
      if (res.data.length > 0) lastMsgTime.current = res.data[res.data.length - 1].createdAt;
    } catch (e) { console.error(e); }
  };

  const sendReply = async () => {
    const chat = openChatRef.current;
    if (!chatInput.trim() || !chat) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      await sendChatMessage(chat.sessionId, { text, from: 'mentor', fromName: profile?.name });
      await pollChatMessages(); // fetch immediately so reply shows up
    } catch (e) { console.error(e); }
  };

  const setStatus = async (s) => {
    setEditStatus(s);
    try {
      const r = await updateMentorMe({ status: s });
      setProfile(r.data);
    } catch (e) { console.error(e); }
  };

  const saveProfile = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const res = await updateMentorMe({
        bio: editBio,
        status: editStatus,
        specialties: editSpecialties.split(',').map(s => s.trim()).filter(Boolean),
      });
      setProfile(res.data);
      setSaveMsg('✓ Profile updated');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) { setSaveMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>Loading your dashboard...</div>
    </div>
  );

  const totalSessions = sessions.length;
  const escalated     = sessions.filter(s => s.escalated).length;
  const avgDuration   = sessions.length ? Math.round(sessions.reduce((a, b) => a + (b.duration || 0), 0) / sessions.length) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon">🧠</div>
          <span className="brand-name">Mind<span className="brand-accent">Bridge</span></span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', marginLeft: 8 }}>Mentor</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: editStatus === s ? `${STATUS_COLORS[s]}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${editStatus === s ? STATUS_COLORS[s] : 'var(--border)'}`,
              color: editStatus === s ? STATUS_COLORS[s] : 'var(--text-dim)',
            }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user?.name}</div>
          <button onClick={logout} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome back, {profile?.name?.split(' ')[0]} 💜</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {STATUS_LABELS[profile?.status || 'available']} &nbsp;·&nbsp; {profile?.specialties?.join(', ') || 'No specialties set'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Sessions', value: totalSessions, icon: '💬' },
              { label: 'Escalated',      value: escalated,     icon: '⚠️' },
              { label: 'Avg Duration',   value: `${avgDuration}m`, icon: '⏱' },
              { label: 'Rating',         value: profile?.rating?.toFixed(1) || '—', icon: '⭐' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 18 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
          {[['overview','📊 Overview'], ['live','💬 Live Chat'], ['sessions','📋 Sessions'], ['profile','⚙️ Profile']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              color: tab === key ? '#a5b4fc' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, gridColumn: 'span 2' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent Sessions</div>
              {sessions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No sessions yet. Users will appear here when they connect with you.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessions.slice(0, 5).map(s => (
                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 22 }}>{s.escalated ? '⚠️' : '💬'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.escalated ? 'Escalated session' : 'Support session'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.messages?.length || 0} messages · {s.duration || 0} min · {timeAgo(s.createdAt)}</div>
                      </div>
                      {s.escalated && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(244,63,94,0.15)', color: '#fca5a5', border: '1px solid rgba(244,63,94,0.3)' }}>Escalated</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Your Bio</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{profile?.bio || 'No bio set. Add one in the Profile tab.'}</div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Specialties</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(profile?.specialties || []).map(s => (
                    <span key={s} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>{s}</span>
                  ))}
                  {!profile?.specialties?.length && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>None set</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Chat Tab */}
        {tab === 'live' && (
          <div style={{ display: 'grid', gridTemplateColumns: openChat ? '280px 1fr' : '1fr', gap: 20, minHeight: 500 }}>
            {/* Session list */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Active Sessions</div>
              {activeChats.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                  No active chats right now.<br /><br />
                  When a user connects with you, their session will appear here automatically.
                  <br /><br />
                  Make sure your status is set to <strong style={{ color: '#22c55e' }}>Available</strong>.
                </div>
              ) : (
                activeChats.map(sid => (
                  <button key={sid} onClick={() => openChatSession(sid, 'User')}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                      background: openChat?.sessionId === sid ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${openChat?.sessionId === sid ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                      cursor: 'pointer', color: 'var(--text)',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>💬 Active Session</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      User: {sid.split('__')[0].slice(0, 10)}...
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Chat window */}
            {openChat && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>U</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>User Session</div>
                    <div style={{ fontSize: 12, color: '#86efac' }}>🟢 Active</div>
                  </div>
                  <button onClick={() => { openChatRef.current = null; setOpenChat(null); setChatMessages([]); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>×</button>
                  <button onClick={async () => {
                    const chat = openChatRef.current;
                    if (chat) {
                      try { await endChatSession(chat.sessionId, { mentorName: profile?.name, escalated: false, duration: 0 }); } catch {}
                    }
                    openChatRef.current = null;
                    setOpenChat(null);
                    setChatMessages([]);
                    setActiveChats(prev => prev.filter(s => s !== chat?.sessionId));
                  }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    End Session
                  </button>
                </div>
                <div className="chat-messages" style={{ flex: 1, minHeight: 300 }}>
                  {chatMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Waiting for messages...</div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={m._id || i} className={`chat-msg ${m.from}`}>
                      <div className="msg-bubble">{m.text}</div>
                      <div className="msg-time">{m.time}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-area" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <input className="chat-input" placeholder="Type your reply..."
                    value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyUp={e => e.key === 'Enter' && sendReply()} />
                  <button className="send-btn" onClick={sendReply}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                No sessions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sessions.map(s => (
                  <div key={s._id} style={{ background: 'var(--surface)', border: `1px solid ${s.escalated ? 'rgba(244,63,94,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 24 }}>{s.escalated ? '⚠️' : '💬'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{s.escalated ? 'Escalated Session' : 'Support Session'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(s.createdAt).toLocaleString()} · {s.duration || 0} min · {s.messages?.length || 0} messages</div>
                      </div>
                      {s.escalated && <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(244,63,94,0.15)', color: '#fca5a5', border: '1px solid rgba(244,63,94,0.3)', fontWeight: 600 }}>Escalated to SOS</span>}
                    </div>
                    {s.messages?.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14, maxHeight: 160, overflowY: 'auto' }}>
                        {s.messages.slice(0, 6).map((m, i) => (
                          <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: m.from === 'volunteer' || m.from === 'mentor' ? '#a5b4fc' : '#86efac' }}>
                              {m.from === 'volunteer' || m.from === 'mentor' ? 'Mentor' : 'User'}:
                            </span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{m.text}</span>
                          </div>
                        ))}
                        {s.messages.length > 6 && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>+{s.messages.length - 6} more messages</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Edit Profile</div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => setEditStatus(s)} style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: editStatus === s ? `${STATUS_COLORS[s]}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${editStatus === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                      color: editStatus === s ? STATUS_COLORS[s] : 'var(--text-dim)',
                    }}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Bio</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell users a bit about yourself..."
                  style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, padding: '12px 14px', resize: 'vertical' }}
                  maxLength={300} />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{editBio.length}/300</div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Specialties <span style={{ fontWeight: 400 }}>(comma-separated)</span>
                </label>
                <input type="text" value={editSpecialties} onChange={e => setEditSpecialties(e.target.value)}
                  placeholder="e.g. Anxiety, Academic Stress, Loneliness"
                  className="form-input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={saveProfile} disabled={saving} className="auth-submit-btn" style={{ width: 'auto', padding: '10px 28px', marginBottom: 0 }}>
                  {saving ? '⏳ Saving...' : 'Save Changes'}
                </button>
                {saveMsg && <span style={{ fontSize: 13, color: saveMsg.startsWith('✓') ? '#86efac' : '#fca5a5' }}>{saveMsg}</span>}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginTop: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Account Info</div>
              {[['Name', profile?.name], ['Email', profile?.email], ['Role', 'Mentor'], ['Sessions', profile?.sessions]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
