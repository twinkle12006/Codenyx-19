import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getAdminMentors, createMentor, updateMentor, deleteMentor,
  getAdminUsers, updateUser, getAdminVents, deleteVent,
  getAdminDoctors, createDoctor, updateDoctor, deleteDoctor,
} from '../api/auth';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS   = ['#6366f1','#8b5cf6','#14b8a6','#f59e0b','#f43f5e','#22c55e'];
const MOOD_CLR = { 'Very Low':'#f43f5e','Low':'#f97316','Okay':'#f59e0b','Good':'#22c55e','Great':'#6366f1' };
const MOOD_EMJ = { anxious:'😰', sad:'😢', overwhelmed:'😵', hopeful:'🌱', angry:'😤', numb:'😶' };
const card = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 24px' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1a1a2e', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight:600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]       = useState('overview');
  const [stats, setStats]   = useState(null);
  const [mentors, setMentors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers]   = useState([]);
  const [vents, setVents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false); // false | 'mentor' | 'doctor'
  const [form, setForm] = useState({ name:'', username:'', email:'', password:'', age:'', specialties:'', bio:'' });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, u, v] = await Promise.all([getAdminStats(), getAdminMentors(), getAdminUsers(), getAdminVents()]);
      setStats(s.data); setMentors(m.data); setUsers(u.data); setVents(v.data);
      try { const d = await getAdminDoctors(); setDoctors(d.data); } catch {}
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddMentor = async () => {
    setFormErr('');
    if (!form.name || !form.username || !form.email || !form.password) { setFormErr('Name, username, email and password are required'); return; }
    setSaving(true);
    try {
      const res = await createMentor({ ...form, age: parseInt(form.age) || 25, specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean) });
      setMentors(m => [res.data, ...m]);
      setAddModal(false);
      setForm({ name:'', username:'', email:'', password:'', age:'', specialties:'', bio:'' });
    } catch (e) { setFormErr(e.response?.data?.message || 'Failed to create mentor'); }
    finally { setSaving(false); }
  }; 
  const toggleMentorStatus = async (mentor) => {
    try { const r = await updateMentor(mentor._id, { status: mentor.status === 'available' ? 'away' : 'available' }); setMentors(m => m.map(x => x._id === mentor._id ? r.data : x)); } catch {}
  };
  const toggleMentorActive = async (mentor) => {
    try { const r = await updateMentor(mentor._id, { isActive: !mentor.isActive }); setMentors(m => m.map(x => x._id === mentor._id ? r.data : x)); } catch {}
  };
  const handleDeleteMentor = async (id) => {
    if (!window.confirm('Remove this mentor permanently?')) return;
    try { await deleteMentor(id); setMentors(m => m.filter(x => x._id !== id)); } catch {}
  };
  const toggleUserActive = async (u) => {
    try { const r = await updateUser(u._id, { isActive: !u.isActive }); setUsers(us => us.map(x => x._id === u._id ? r.data : x)); } catch {}
  };
  const handleDeleteVent = async (id) => {
    try { await deleteVent(id); setVents(v => v.filter(x => x._id !== id)); } catch {}
  };

  const availableMentors = mentors.filter(m => m.status === 'available' && m.isActive !== false).length;
  const activeUsers      = users.filter(u => u.isActive !== false).length;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'Inter,sans-serif' }}>
      {/* Navbar */}
      <div style={{ background:'rgba(10,10,20,0.95)', borderBottom:'1px solid var(--border)', padding:'14px 32px', display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:100, backdropFilter:'blur(20px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>🧠</span>
          <span style={{ fontWeight:800, fontSize:18 }}>Sah<span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ara</span></span>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(244,63,94,0.15)', border:'1px solid rgba(244,63,94,0.3)', color:'#fca5a5', fontWeight:700, marginLeft:4 }}>NGO ADMIN</span>
        </div>
        <div style={{ display:'flex', gap:4, marginLeft:32 }}>
          {[['overview','📊 Overview'],['analytics','📈 Analytics'],['mentors','🤝 Staff'],['doctors','🏥 Doctors'],['users','👥 Users'],['vents','🌊 Vents']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding:'7px 16px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background: tab===key ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab===key ? '#a5b4fc' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>👤 {user?.name}</span>
          <button onClick={logout} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding:'32px 40px', maxWidth:1300, margin:'0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
              <div>
                <h2 style={{ fontSize:26, fontWeight:800, margin:0 }}>NGO Command Center</h2>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Real-time platform health at a glance</p>
              </div>
              <div style={{ fontSize:12, color:'var(--text-dim)', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', padding:'6px 14px', borderRadius:20 }}>
                🟢 Platform Live
              </div>
            </div>

            {loading ? <div style={{ color:'var(--text-muted)', padding:40, textAlign:'center' }}>Loading analytics...</div> : (
              <>
                {/* KPI row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
                  {[
                    { icon:'👥', label:'Total Users',       value: stats?.totalUsers,    sub:`+${stats?.newUsers7 || 0} this week`,   color:'#6366f1' },
                    { icon:'🤝', label:'Active Mentors',    value: availableMentors,     sub:`${mentors.length} total staff`,          color:'#22c55e' },
                    { icon:'💬', label:'Support Sessions',  value: stats?.totalSessions, sub:`${stats?.sessions30 || 0} this month`,   color:'#14b8a6' },
                    { icon:'🆘', label:'Crisis Escalations',value: stats?.escalated || 0,sub:`${stats?.avgDuration || 0} min avg session`, color:'#f43f5e' },
                  ].map((k, i) => (
                    <div key={i} style={{ ...card, borderLeft:`3px solid ${k.color}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <span style={{ fontSize:24 }}>{k.icon}</span>
                        <span style={{ fontSize:11, color:k.color, background:`${k.color}18`, padding:'3px 8px', borderRadius:20, fontWeight:600 }}>LIVE</span>
                      </div>
                      <div style={{ fontSize:32, fontWeight:900, color:k.color }}>{k.value ?? '—'}</div>
                      <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{k.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:3 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                  {/* Daily check-ins area chart */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>📊 Daily Mood Check-ins (14 days)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={stats?.dailyCheckins || []}>
                        <defs>
                          <linearGradient id="checkinGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="checkins" name="Check-ins" stroke="#6366f1" strokeWidth={2} fill="url(#checkinGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sessions bar chart */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>💬 Support Sessions (14 days)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats?.dailySessions || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sessions" name="Sessions" fill="#14b8a6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bottom row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
                  {/* Mood distribution pie */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>😶 Mood Distribution (30 days)</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={stats?.moodDistribution || []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                          {(stats?.moodDistribution || []).map((entry, i) => (
                            <Cell key={i} fill={MOOD_CLR[entry.label] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background:'#1a1a2e', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, fontSize:12 }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:'var(--text-muted)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Slot distribution */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>🕐 Check-in by Time of Day</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={(stats?.slotDistribution || []).map(s => ({ ...s, slot: s.slot.charAt(0).toUpperCase() + s.slot.slice(1) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="slot" tick={{ fill:'#64748b', fontSize:11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Check-ins" radius={[4,4,0,0]}>
                          {(stats?.slotDistribution || []).map((_, i) => <Cell key={i} fill={['#f59e0b','#6366f1','#8b5cf6'][i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Vent mood breakdown */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>🌊 Community Mood Breakdown</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats?.ventMoodDist || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="mood" type="category" tick={{ fill:'#94a3b8', fontSize:11 }} tickLine={false} axisLine={false} width={80}
                          tickFormatter={v => `${MOOD_EMJ[v] || ''} ${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Posts" fill="#8b5cf6" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* High distress alerts */}
                {stats?.highDistressVents?.length > 0 && (
                  <div style={{ ...card, marginTop:20, borderColor:'rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.04)' }}>
                    <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16, color:'#fca5a5', display:'flex', alignItems:'center', gap:8 }}>
                      🚨 High Distress Posts — Needs Attention
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(244,63,94,0.2)', color:'#fca5a5' }}>{stats.highDistressVents.length}</span>
                    </h3>
                    {stats.highDistressVents.map(v => (
                      <div key={v._id} style={{ padding:'12px 0', borderBottom:'1px solid rgba(244,63,94,0.1)', display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:v.color+'22', color:v.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>{v.anon?.charAt(0)}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{v.anon} <span style={{ fontSize:11, color:'#fca5a5', marginLeft:6 }}>distress: {(v.distress*100).toFixed(0)}%</span></div>
                          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{v.text?.slice(0,120)}...</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div>
            <h2 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>Platform Analytics</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:28 }}>Deep-dive into user wellbeing trends and platform engagement</p>
            {loading ? <div style={{ color:'var(--text-muted)', padding:40, textAlign:'center' }}>Loading...</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {/* Full-width area chart */}
                <div style={card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>📈 Engagement Trends — Last 14 Days</div>
                    <div style={{ display:'flex', gap:16, fontSize:12 }}>
                      <span style={{ color:'#6366f1' }}>● Mood Check-ins</span>
                      <span style={{ color:'#14b8a6' }}>● Support Sessions</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={(stats?.dailyCheckins || []).map((d, i) => ({ ...d, sessions: stats?.dailySessions?.[i]?.sessions || 0 }))}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill:'#64748b', fontSize:11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="checkins" name="Check-ins" stroke="#6366f1" strokeWidth={2.5} fill="url(#g1)" />
                      <Area type="monotone" dataKey="sessions" name="Sessions"  stroke="#14b8a6" strokeWidth={2.5} fill="url(#g2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                  {/* Mood distribution bar */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>🧠 Mood Score Distribution</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats?.moodDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" tick={{ fill:'#94a3b8', fontSize:11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Logs" radius={[6,6,0,0]}>
                          {(stats?.moodDistribution || []).map((entry, i) => (
                            <Cell key={i} fill={MOOD_CLR[entry.label] || COLORS[i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Mentor performance */}
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>🤝 Mentor Performance</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mentors.slice(0,6).map(m => ({ name: m.name.split(' ')[0], sessions: m.sessions, rating: m.rating }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sessions" name="Sessions" fill="#8b5cf6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
                  {[
                    { label:'Total Check-ins',    value: stats?.totalCheckins || 0,   icon:'📊', color:'#6366f1' },
                    { label:'Sessions This Month', value: stats?.sessions30 || 0,      icon:'💬', color:'#14b8a6' },
                    { label:'Avg Session Length',  value: `${stats?.avgDuration || 0}m`, icon:'⏱', color:'#f59e0b' },
                    { label:'Active Users',        value: activeUsers,                 icon:'✅', color:'#22c55e' },
                  ].map((k, i) => (
                    <div key={i} style={{ ...card, textAlign:'center' }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>{k.icon}</div>
                      <div style={{ fontSize:28, fontWeight:900, color:k.color }}>{k.value}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{k.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STAFF (MENTORS) ── */}
        {tab === 'mentors' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:26, fontWeight:800, margin:0 }}>Staff Management</h2>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{availableMentors} of {mentors.length} mentors available now</p>
              </div>
              <button onClick={() => setAddModal('mentor')} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>+ Add Mentor</button>
            </div>

            {/* Mentor stats bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              {[
                { label:'Available Now', value: availableMentors, color:'#22c55e' },
                { label:'Away',          value: mentors.filter(m => m.status === 'away').length, color:'#f59e0b' },
                { label:'Deactivated',   value: mentors.filter(m => m.isActive === false).length, color:'#f43f5e' },
              ].map((s, i) => (
                <div key={i} style={{ ...card, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, boxShadow:`0 0 8px ${s.color}` }} />
                  <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {loading ? <div style={{ color:'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {mentors.map((m, idx) => (
                  <div key={m._id} style={{ ...card, display:'flex', alignItems:'center', gap:16, opacity: m.isActive===false ? 0.5 : 1 }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:COLORS[idx%COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:'white', flexShrink:0 }}>
                      {m.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{m.name} <span style={{ fontSize:12, color:'var(--text-dim)', marginLeft:4 }}>@{m.username}</span></div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{m.specialties?.join(' · ') || 'No specialties'}</div>
                      <div style={{ display:'flex', gap:12, marginTop:6 }}>
                        <span style={{ fontSize:12, color:'#a5b4fc' }}>💬 {m.sessions} sessions</span>
                        <span style={{ fontSize:12, color:'#fcd34d' }}>⭐ {m.rating?.toFixed(1)}</span>
                        {m.bio && <span style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic' }}>"{m.bio.slice(0,50)}{m.bio.length>50?'...':''}"</span>}
                      </div>
                    </div>
                    {/* Rating bar */}
                    <div style={{ width:80, textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4 }}>Rating</div>
                      <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${(m.rating/5)*100}%`, background:'linear-gradient(90deg,#f59e0b,#22c55e)', borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fcd34d', marginTop:3 }}>{m.rating?.toFixed(1)}/5</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                      <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background: m.status==='available' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: m.status==='available' ? '#86efac' : '#fcd34d', border:`1px solid ${m.status==='available' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                        {m.status === 'available' ? '🟢 Available' : '🟡 Away'}
                      </span>
                      <button onClick={() => toggleMentorStatus(m)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Toggle</button>
                      <button onClick={() => toggleMentorActive(m)} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${m.isActive===false ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, background: m.isActive===false ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: m.isActive===false ? '#86efac' : '#fcd34d', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                        {m.isActive===false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button onClick={() => handleDeleteMentor(m._id)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <h2 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>User Management</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{activeUsers} active · {users.length - activeUsers} deactivated</p>
            {loading ? <div style={{ color:'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {users.map(u => (
                  <div key={u._id} style={{ ...card, display:'flex', alignItems:'center', gap:14, opacity: u.isActive===false ? 0.5 : 1 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'white', flexShrink:0 }}>
                      {u.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{u.name} <span style={{ fontSize:12, color:'var(--text-dim)' }}>@{u.username}</span></div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>Age: {u.age} · Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background: u.isActive===false ? 'rgba(244,63,94,0.1)' : 'rgba(34,197,94,0.1)', color: u.isActive===false ? '#fca5a5' : '#86efac', border:`1px solid ${u.isActive===false ? 'rgba(244,63,94,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                      {u.isActive===false ? 'Deactivated' : 'Active'}
                    </div>
                    <button onClick={() => toggleUserActive(u)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${u.isActive===false ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, background: u.isActive===false ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: u.isActive===false ? '#86efac' : '#fcd34d', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                      {u.isActive===false ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCTORS ── */}
        {tab === 'doctors' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:26, fontWeight:800, margin:0 }}>SOS Doctor Management</h2>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{doctors.filter(d=>d.status==='available').length} of {doctors.length} doctors available</p>
              </div>
              <button onClick={() => setAddModal('doctor')} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f43f5e,#e11d48)', color:'white', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>+ Add Doctor</button>
            </div>
            {loading ? <div style={{ color:'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {doctors.map((d, idx) => (
                  <div key={d._id} style={{ ...card, display:'flex', alignItems:'center', gap:16, opacity: d.isActive===false ? 0.5 : 1 }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#f43f5e,#e11d48)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:'white', flexShrink:0 }}>
                      {d.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{d.name} <span style={{ fontSize:12, color:'var(--text-dim)' }}>@{d.username}</span></div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{d.qualification || 'Crisis Therapist'} · {d.experience || 0} yrs exp</div>
                      <div style={{ display:'flex', gap:12, marginTop:4 }}>
                        <span style={{ fontSize:12, color:'#86efac' }}>✅ {d.casesResolved || 0} resolved</span>
                        <span style={{ fontSize:12, color:'#fca5a5' }}>🔴 {d.activeCases || 0} active</span>
                        <span style={{ fontSize:12, color:'#fcd34d' }}>⭐ {d.rating?.toFixed(1)}</span>
                        {d.zoomLink && <span style={{ fontSize:12, color:'#a5b4fc' }}>🎥 Zoom set</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                      <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background: d.status==='available' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: d.status==='available' ? '#86efac' : '#fcd34d', border:`1px solid ${d.status==='available' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                        {d.status === 'available' ? '🟢 Available' : '🟡 Away'}
                      </span>
                      <button onClick={async () => { try { const r = await updateDoctor(d._id, { isActive: !d.isActive }); setDoctors(ds => ds.map(x => x._id===d._id ? r.data : x)); } catch {} }} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${d.isActive===false ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, background: d.isActive===false ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: d.isActive===false ? '#86efac' : '#fcd34d', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                        {d.isActive===false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button onClick={async () => { if (!window.confirm('Remove doctor?')) return; try { await deleteDoctor(d._id); setDoctors(ds => ds.filter(x => x._id!==d._id)); } catch {} }} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VENTS ── */}
        {tab === 'vents' && (
          <div>
            <h2 style={{ fontSize:26, fontWeight:800, marginBottom:6 }}>Content Moderation</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{vents.filter(v=>v.distress>0.7).length} high-distress posts need review</p>
            {loading ? <div style={{ color:'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {vents.map(v => (
                  <div key={v._id} style={{ ...card, position:'relative', borderColor: v.distress>0.7 ? 'rgba(244,63,94,0.3)' : 'var(--border)' }}>
                    {v.distress > 0.7 && <div style={{ position:'absolute', top:16, right:16, fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(244,63,94,0.15)', color:'#fca5a5', fontWeight:700 }}>🚨 {(v.distress*100).toFixed(0)}% distress</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:v.color+'22', color:v.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{v.anon?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{v.anon}</div>
                        <div style={{ fontSize:11, color:'var(--text-dim)' }}>{new Date(v.createdAt).toLocaleString()} · {MOOD_EMJ[v.mood]||''} {v.mood}</div>
                      </div>
                    </div>
                    <p style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.6, marginBottom:12 }}>{v.text}</p>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'var(--text-dim)' }}>👍 {v.likes||0} · 💬 {v.comments?.length||0} comments</span>
                      <button onClick={() => handleDeleteVent(v._id)} style={{ marginLeft:'auto', padding:'6px 14px', borderRadius:8, border:'1px solid rgba(244,63,94,0.3)', background:'rgba(244,63,94,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>🗑 Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Mentor Modal */}
      {addModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setAddModal(false)}>
          <div style={{ background:'#12121f', border:'1px solid var(--border-strong)', borderRadius:20, padding:32, width:480, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h3 style={{ fontSize:20, fontWeight:800 }}>{addModal === 'doctor' ? '🏥 Add New Doctor' : '🤝 Add New Mentor'}</h3>
              <button onClick={() => setAddModal(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:24, cursor:'pointer' }}>×</button>
            </div>
            {(addModal === 'doctor'
              ? [['Name','name','text','Dr. Ananya'],['Username','username','text','dr_ananya'],['Email','email','email','ananya@sahara.ngo'],['Password','password','password','Min 8 chars'],['Age','age','number','35'],['Qualification','qualification','text','MBBS, MD Psychiatry'],['Experience (years)','experience','number','10'],['Specializations (comma separated)','specialties','text','Crisis, Trauma'],['Zoom Link','zoomLink','text','https://zoom.us/j/...'],['Bio','bio','text','Short intro...']]
              : [['Name','name','text','Priya M.'],['Username','username','text','priya_m'],['Email','email','email','priya@mindbridge.ngo'],['Password','password','password','Min 8 characters'],['Age','age','number','25'],['Specialties (comma separated)','specialties','text','Anxiety, Depression'],['Bio','bio','text','Short intro...']]
            ).map(([label, key, type, ph]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{label}</label>
                <input type={type} className="form-input" placeholder={ph} value={form[key]||''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width:'100%' }} />
              </div>
            ))}
            {formErr && <div style={{ color:'#fca5a5', fontSize:13, marginBottom:12 }}>⚠ {formErr}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button onClick={async () => {
                setFormErr('');
                if (!form.name || !form.username || !form.email || !form.password) { setFormErr('Name, username, email and password are required'); return; }
                setSaving(true);
                try {
                  if (addModal === 'doctor') {
                    const r = await createDoctor({ ...form, age: parseInt(form.age)||30, experience: parseInt(form.experience)||0, specialties: (form.specialties||'').split(',').map(s=>s.trim()).filter(Boolean) });
                    setDoctors(d => [r.data, ...d]);
                  } else {
                    const r = await createMentor({ ...form, age: parseInt(form.age)||25, specialties: (form.specialties||'').split(',').map(s=>s.trim()).filter(Boolean) });
                    setMentors(m => [r.data, ...m]);
                  }
                  setAddModal(false);
                  setForm({ name:'', username:'', email:'', password:'', age:'', specialties:'', bio:'' });
                } catch (e) { setFormErr(e.response?.data?.message || 'Failed to create'); }
                finally { setSaving(false); }
              }} disabled={saving} style={{ padding:'10px 24px', borderRadius:10, border:'none', background: addModal==='doctor' ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {saving ? '⏳ Creating...' : addModal==='doctor' ? 'Add Doctor' : 'Create Mentor'}
              </button>
              <button onClick={() => setAddModal(false)} style={{ padding:'10px 20px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
