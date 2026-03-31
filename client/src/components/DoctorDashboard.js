import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getDoctorMe, updateDoctorMe, getDoctorActiveSos } from '../api/auth';

const STATUS_COLORS = { available: '#22c55e', away: '#f59e0b', busy: '#f43f5e' };
const STATUS_LABELS = { available: '🟢 Available', away: '🟡 Away', busy: '🔴 Busy' };

export default function DoctorDashboard() {
  const { user, logout }      = useAuth();
  const { socket, connected } = useSocket();
  const [tab, setTab]         = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Edit state
  const [editBio, setEditBio]           = useState('');
  const [editStatus, setEditStatus]     = useState('available');
  const [editZoom, setEditZoom]         = useState('');
  const [editQual, setEditQual]         = useState('');
  const [editExp, setEditExp]           = useState(0);
  const [editSpec, setEditSpec]         = useState('');

  // SOS chat state
  const [activeSessions, setActiveSessions] = useState([]);
  const [openChat, setOpenChat]             = useState(null);
  const [chatMessages, setChatMessages]     = useState([]);
  const [chatInput, setChatInput]           = useState('');
  const [userTyping, setUserTyping]         = useState(false);
  const openChatRef   = useRef(null);
  const typingTimer   = useRef(null);
  const messagesEnd   = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const r = await getDoctorMe();
      setProfile(r.data);
      setEditBio(r.data.bio || '');
      setEditStatus(r.data.status || 'available');
      setEditZoom(r.data.zoomLink || '');
      setEditQual(r.data.qualification || '');
      setEditExp(r.data.experience || 0);
      setEditSpec((r.data.specialties || []).join(', '));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const pollSessions = useCallback(async () => {
    try { const r = await getDoctorActiveSos(); setActiveSessions(r.data); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => {
    pollSessions();
    const t = setInterval(pollSessions, 8000);
    return () => clearInterval(t);
  }, [pollSessions]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, userTyping]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg) => {
      const chat = openChatRef.current;
      if (!chat || msg.sessionId !== chat) return;
      setChatMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, {
        _id: msg._id,
        from: msg.from === 'doctor' ? 'sent' : 'recv',
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    };
    const onTyping = ({ isTyping }) => {
      setUserTyping(isTyping);
      if (isTyping) { clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setUserTyping(false), 3000); }
    };
    const onEnded = () => {
      const sid = openChatRef.current;
      if (sid) {
        setActiveSessions(p => p.filter(s => s !== sid));
        openChatRef.current = null;
        setOpenChat(null);
        setChatMessages([]);
      }
    };
    socket.on('new_message',   onMsg);
    socket.on('typing',        onTyping);
    socket.on('session_ended', onEnded);
    return () => { socket.off('new_message', onMsg); socket.off('typing', onTyping); socket.off('session_ended', onEnded); };
  }, [socket]);

  const openSession = (sid) => {
    if (!socket) return;
    openChatRef.current = sid;
    setOpenChat(sid);
    setChatMessages([]);
    socket.emit('join_session', sid);
  };

  const closeSession = () => {
    if (openChat && socket) socket.emit('leave_session', openChat);
    openChatRef.current = null;
    setOpenChat(null);
    setChatMessages([]);
  };

  const endSession = () => {
    const sid = openChatRef.current;
    if (sid && socket) {
      socket.emit('end_session', { sessionId: sid, mentorName: profile?.name, escalated: false, duration: 0 });
      socket.emit('leave_session', sid);
    }
    setActiveSessions(p => p.filter(s => s !== sid));
    openChatRef.current = null;
    setOpenChat(null);
    setChatMessages([]);
  };

  const sendMessage = (text) => {
    const sid = openChatRef.current;
    if (!text?.trim() || !sid || !socket) return;
    socket.emit('send_message', { sessionId: sid, text: text.trim(), from: 'doctor', fromName: profile?.name });
    socket.emit('typing', { sessionId: sid, isTyping: false });
    setChatInput('');
  };

  const sendZoomLink = () => {
    if (!profile?.zoomLink) { alert('Set your Zoom link in the Profile tab first.'); return; }
    sendMessage(`🎥 Join our video session: ${profile.zoomLink}`);
  };

  const handleChatInput = (e) => {
    setChatInput(e.target.value);
    const sid = openChatRef.current;
    if (!sid || !socket) return;
    socket.emit('typing', { sessionId: sid, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { sessionId: sid, isTyping: false }), 2000);
  };

  const setStatus = async (s) => {
    setEditStatus(s);
    try { const r = await updateDoctorMe({ status: s }); setProfile(r.data); } catch {}
  };

  const saveProfile = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const r = await updateDoctorMe({
        bio: editBio, status: editStatus, zoomLink: editZoom,
        qualification: editQual, experience: parseInt(editExp) || 0,
        specialties: editSpec.split(',').map(s => s.trim()).filter(Boolean),
      });
      setProfile(r.data);
      setSaveMsg('✓ Profile saved');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', color:'var(--text-muted)' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:40, marginBottom:12 }}>🏥</div>Loading your dashboard...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'Inter,sans-serif' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon">🧠</div>
          <span className="brand-name">Sah<span className="brand-accent">ara</span></span>
          <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'rgba(244,63,94,0.15)', color:'#fca5a5', marginLeft:8, fontWeight:700 }}>SOS Doctor</span>
        </div>
        <div style={{ display:'flex', gap:6, marginLeft:'auto', alignItems:'center' }}>
          {['available','away','busy'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', background: editStatus===s ? `${STATUS_COLORS[s]}22` : 'rgba(255,255,255,0.05)', border:`1px solid ${editStatus===s ? STATUS_COLORS[s] : 'var(--border)'}`, color: editStatus===s ? STATUS_COLORS[s] : 'var(--text-dim)' }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
          <div style={{ width:1, height:24, background:'var(--border)', margin:'0 8px' }} />
          <span style={{ fontSize:14, color:'var(--text-muted)' }}>{user?.name}</span>
          <button onClick={logout} style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', color:'#fca5a5', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:13 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 32px 60px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32, flexWrap:'wrap' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#f43f5e,#e11d48)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, color:'white', flexShrink:0 }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Dr. {profile?.name?.split(' ')[0]} 🏥</h1>
            <div style={{ fontSize:14, color:'var(--text-muted)' }}>{profile?.qualification || 'Crisis Therapist'} · {profile?.experience || 0} yrs experience</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { label:'Cases Resolved', value: profile?.casesResolved || 0, icon:'✅', color:'#22c55e' },
              { label:'Active Cases',   value: profile?.activeCases || 0,   icon:'🔴', color:'#f43f5e' },
              { label:'Rating',         value: `${profile?.rating?.toFixed(1) || '5.0'}⭐`, icon:'⭐', color:'#f59e0b' },
              { label:'SOS Sessions',   value: activeSessions.length,        icon:'🆘', color:'#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center', padding:'12px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
                <div style={{ fontSize:18 }}>{s.icon}</div>
                <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:'1px solid var(--border)' }}>
          {[['overview','📊 Overview'],['sos','🆘 SOS Sessions'],['profile','⚙️ Profile']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit', color: tab===key ? '#fca5a5' : 'var(--text-muted)', borderBottom: tab===key ? '2px solid #f43f5e' : '2px solid transparent', marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24, gridColumn:'span 2' }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>🏥 Doctor Profile</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                {[
                  { label:'Qualification',   value: profile?.qualification || '—' },
                  { label:'Experience',      value: `${profile?.experience || 0} years` },
                  { label:'Specializations', value: profile?.specialties?.join(', ') || '—' },
                  { label:'Cases Resolved',  value: profile?.casesResolved || 0 },
                  { label:'Active Cases',    value: profile?.activeCases || 0 },
                  { label:'Zoom Link',       value: profile?.zoomLink ? '✅ Set' : '❌ Not set' },
                ].map(item => (
                  <div key={item.label} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4 }}>{item.label}</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {profile?.bio && (
                <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(244,63,94,0.05)', borderRadius:10, border:'1px solid rgba(244,63,94,0.15)', fontSize:14, color:'var(--text-muted)', fontStyle:'italic' }}>
                  "{profile.bio}"
                </div>
              )}
            </div>

            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:12 }}>🆘 Active SOS Sessions</div>
              {activeSessions.length === 0 ? (
                <div style={{ color:'var(--text-muted)', fontSize:14 }}>No active SOS sessions right now. When a user connects, they'll appear here.</div>
              ) : (
                activeSessions.map(sid => (
                  <button key={sid} onClick={() => { setTab('sos'); openSession(sid); }} style={{ width:'100%', textAlign:'left', padding:'12px 14px', borderRadius:10, marginBottom:8, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)', cursor:'pointer', color:'var(--text)' }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>🆘 Crisis Session</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>ID: {sid.slice(0,20)}...</div>
                  </button>
                ))
              )}
            </div>

            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:12 }}>📋 Quick Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={() => setTab('sos')} style={{ padding:'12px 16px', borderRadius:10, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.08)', color:'#fca5a5', cursor:'pointer', fontFamily:'inherit', fontWeight:600, textAlign:'left' }}>
                  🆘 View SOS Sessions ({activeSessions.length} active)
                </button>
                <button onClick={() => setTab('profile')} style={{ padding:'12px 16px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, textAlign:'left' }}>
                  ⚙️ Update Profile & Zoom Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SOS SESSIONS */}
        {tab === 'sos' && (
          <div style={{ display:'grid', gridTemplateColumns: openChat ? '280px 1fr' : '1fr', gap:20, minHeight:500 }}>
            {/* Session list */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>
                🆘 Active SOS Sessions
                <span style={{ marginLeft:8, fontSize:11, padding:'2px 8px', borderRadius:20, background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: connected ? '#86efac' : '#fcd34d', border:`1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  {connected ? '🟢 Live' : '⏳ Connecting'}
                </span>
              </div>
              {activeSessions.length === 0 ? (
                <div style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>No active SOS sessions.<br /><br />When a user triggers SOS, their session appears here automatically.</div>
              ) : (
                activeSessions.map(sid => (
                  <button key={sid} onClick={() => openSession(sid)} style={{ width:'100%', textAlign:'left', padding:'12px 14px', borderRadius:10, marginBottom:8, background: openChat===sid ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${openChat===sid ? 'rgba(244,63,94,0.4)' : 'var(--border)'}`, cursor:'pointer', color:'var(--text)' }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>🆘 Crisis Session</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>User: {sid.split('__')[0].slice(0,12)}...</div>
                  </button>
                ))
              )}
            </div>

            {/* Chat window */}
            {openChat && (
              <div style={{ background:'var(--surface)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {/* Chat header */}
                <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(244,63,94,0.2)', display:'flex', alignItems:'center', gap:12, background:'rgba(244,63,94,0.05)' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(244,63,94,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🆘</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>Crisis Session</div>
                    <div style={{ fontSize:12, color:'#fca5a5' }}>Anonymous user · SOS</div>
                  </div>
                  <button onClick={sendZoomLink} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(99,102,241,0.4)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600 }}>
                    🎥 Send Zoom Link
                  </button>
                  <button onClick={endSession} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>End Session</button>
                  <button onClick={closeSession} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:20 }}>×</button>
                </div>

                {/* Messages */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10, minHeight:300 }}>
                  {chatMessages.length === 0 && (
                    <div style={{ textAlign:'center', color:'var(--text-dim)', fontSize:13, padding:20 }}>Session open — waiting for messages 🆘</div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={m._id||i} style={{ display:'flex', justifyContent: m.from==='sent' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth:'75%' }}>
                        <div style={{ padding:'10px 14px', borderRadius: m.from==='sent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.from==='sent' ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'rgba(255,255,255,0.07)', color:'white', fontSize:14, lineHeight:1.5 }}>
                          {m.text}
                        </div>
                        <div style={{ fontSize:10, color:'#475569', marginTop:3, textAlign: m.from==='sent' ? 'right' : 'left' }}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                  {userTyping && <div style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic' }}>User is typing...</div>}
                  <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
                  <input value={chatInput} onChange={handleChatInput} onKeyUp={e => e.key==='Enter' && sendMessage(chatInput)}
                    placeholder="Type your response..."
                    style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'rgba(255,255,255,0.05)', color:'var(--text)', fontSize:14, outline:'none' }} />
                  <button onClick={() => sendMessage(chatInput)} style={{ padding:'10px 16px', borderRadius:10, border:'none', background:'#f43f5e', color:'white', cursor:'pointer', fontWeight:700 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div style={{ maxWidth:600 }}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>⚙️ Edit Profile</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Bio', key:'bio', value:editBio, set:setEditBio, type:'textarea' },
                { label:'Qualification (e.g. MBBS, MD Psychiatry)', key:'qual', value:editQual, set:setEditQual, type:'text' },
                { label:'Experience (years)', key:'exp', value:editExp, set:setEditExp, type:'number' },
                { label:'Specializations (comma separated)', key:'spec', value:editSpec, set:setEditSpec, type:'text' },
                { label:'Zoom Meeting Link', key:'zoom', value:editZoom, set:setEditZoom, type:'text', placeholder:'https://zoom.us/j/...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={f.value} onChange={e => f.set(e.target.value)} rows={3}
                      style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:13, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
                  ) : (
                    <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder || ''}
                      style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f43f5e,#e11d48)', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {saving ? '⏳ Saving...' : 'Save Profile'}
                </button>
                {saveMsg && <span style={{ fontSize:13, color: saveMsg.includes('✓') ? '#86efac' : '#fca5a5' }}>{saveMsg}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
