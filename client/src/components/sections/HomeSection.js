import React, { useState, useEffect, useCallback } from 'react';
import { getStats, logMood, getTodayMoods } from '../../api/auth';

const SLOTS = [
  { key: 'morning',   label: 'Morning Check-in',  icon: '🌅', hours: [5, 11],  prompt: 'How did you wake up feeling today?',  sub: 'Starting the day with awareness sets a positive tone.',    color: '#f59e0b' },
  { key: 'afternoon', label: 'Afternoon Check-in', icon: '☀️', hours: [12, 17], prompt: 'How are you holding up mid-day?',      sub: 'A quick check-in helps you catch stress before it builds.', color: '#6366f1' },
  { key: 'evening',   label: 'Evening Reflection', icon: '🌙', hours: [18, 23], prompt: 'How did today treat you overall?',     sub: 'Reflecting at night helps you process and wind down.',      color: '#8b5cf6' },
];

const MOOD_OPTIONS = [
  { score: 1, emoji: '😞', label: 'Very Low' },
  { score: 2, emoji: '😔', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];

function getCurrentSlot() {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) return SLOTS[2]; // midnight counts as evening
  return SLOTS.find(s => h >= s.hours[0] && h <= s.hours[1]) || null;
}

function slotTimeLabel(key) {
  return { morning: '5 AM – 12 PM', afternoon: '12 PM – 6 PM', evening: '6 PM – 12 AM' }[key] || '';
}

export default function HomeSection({ navTo }) {
  const [stats, setStats]               = useState({ users: 0, volunteers: 0, slots: 0, ventsToday: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayLogs, setTodayLogs]       = useState([]);
  const [loadingMood, setLoadingMood]   = useState(true);
  const [activeSlot, setActiveSlot]     = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [note, setNote]                 = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [justLogged, setJustLogged]     = useState(null);
  const [manualSlot, setManualSlot]     = useState(null);

  const fetchTodayMoods = useCallback(async () => {
    try {
      const res = await getTodayMoods();
      setTodayLogs(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingMood(false); }
  }, []);

  useEffect(() => { fetchTodayMoods(); }, [fetchTodayMoods]);

  useEffect(() => {
    if (loadingMood) return;
    const slot = manualSlot || getCurrentSlot();
    if (!slot) { setActiveSlot(null); return; }
    const alreadyDone = todayLogs.find(l => l.slot === slot.key);
    setActiveSlot(alreadyDone ? null : slot);
  }, [loadingMood, todayLogs, manualSlot]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const t = setInterval(fetchStats, 15000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const submitMood = async () => {
    if (!selectedScore || !activeSlot) return;
    setSubmitting(true);
    const label = MOOD_OPTIONS.find(m => m.score === selectedScore)?.label || '';
    try {
      await logMood({ score: selectedScore, label, slot: activeSlot.key, note });
      setJustLogged({ slot: activeSlot.key, score: selectedScore, label });
      setActiveSlot(null);
      setManualSlot(null);
      setSelectedScore(null);
      setNote('');
      fetchTodayMoods();
    } catch (e) {
      if (e.response?.status === 409) fetchTodayMoods();
      else console.error(e);
    } finally { setSubmitting(false); }
  };

  const doneSlots = SLOTS.filter(s => todayLogs.find(l => l.slot === s.key));
  const allDone   = doneSlots.length === SLOTS.length;
  const avgToday  = todayLogs.length
    ? (todayLogs.reduce((a, b) => a + b.score, 0) / todayLogs.length).toFixed(1)
    : null;
  const nextSlot  = SLOTS.find(s => {
    const h = new Date().getHours();
    return s.hours[0] > h && !todayLogs.find(l => l.slot === s.key);
  });

  return (
    <section className="section active" id="section-home">

      {/* Hero */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-badge">🌱 NGO Mental Health Initiative</div>
          <h1 className="hero-title">You Are <span className="gradient-text">Never</span><br />Alone Here</h1>
          <p className="hero-subtitle">
            MindBridge connects youth with the right level of support — from community peers to trained volunteers to licensed crisis therapists.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navTo('vent')}>Start Venting</button>
            <button className="btn btn-ghost"   onClick={() => navTo('help')}>Find Support</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-cards-stack">
            <div className="mini-card mc-1"><span className="mc-icon">💜</span><div className="mc-text"><div className="mc-title">Community heard you</div><div className="mc-sub">Real reactions from real people</div></div></div>
            <div className="mini-card mc-2"><span className="mc-icon">🤝</span><div className="mc-text"><div className="mc-title">Volunteers ready</div><div className="mc-sub">{stats.volunteers || '...'} available right now</div></div></div>
            <div className="mini-card mc-3"><span className="mc-icon">🏥</span><div className="mc-text"><div className="mc-title">Emergency slots</div><div className="mc-sub">{stats.slots || '...'} open nearby</div></div></div>
          </div>
        </div>
      </div>

      {/* Mood Check-in Widget */}
      <div className="mood-checkin-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="mci-icon" style={{ fontSize: 24 }}>📊</div>
            <div>
              <div className="mci-title">Daily Mood Tracker</div>
              <div className="mci-sub">3 check-ins per day — morning, afternoon &amp; evening</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SLOTS.map(s => {
              const done = !!todayLogs.find(l => l.slot === s.key);
              const isCurrent = activeSlot?.key === s.key || manualSlot?.key === s.key;
              return (
                <button key={s.key}
                  onClick={() => { if (!done) { setManualSlot(s); setSelectedScore(null); setNote(''); } }}
                  title={done ? 'Already logged' : `Log ${s.label}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: done ? 'rgba(34,197,94,0.15)' : isCurrent ? `${s.color}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : isCurrent ? s.color + '55' : 'var(--border)'}`,
                    color: done ? '#86efac' : isCurrent ? s.color : 'var(--text-dim)',
                    cursor: done ? 'default' : 'pointer',
                  }}>
                  {s.icon} {s.label.split(' ')[0]}
                  {done ? <span style={{ marginLeft: 2 }}>✓</span> : <span style={{ marginLeft: 2, fontSize: 10, opacity: 0.6 }}>tap</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* All done */}
        {allDone && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>All 3 check-ins done for today!</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Your average mood today: <strong style={{ color: '#a5b4fc' }}>{avgToday} / 5</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {doneSlots.map(s => {
                const log = todayLogs.find(l => l.slot === s.key);
                const opt = MOOD_OPTIONS.find(m => m.score === log?.score);
                return (
                  <div key={s.key} style={{ padding: '8px 16px', borderRadius: 12, fontSize: 13, background: `${s.color}18`, border: `1px solid ${s.color}44`, color: s.color }}>
                    {s.icon} {s.label.split(' ')[0]}: {opt?.emoji} {opt?.label}
                  </div>
                );
              })}
            </div>
            <button className="mci-view-btn" style={{ marginTop: 16 }} onClick={() => navTo('card')}>View Health Card →</button>
          </div>
        )}

        {/* Just logged */}
        {!allDone && justLogged && !activeSlot && (
          <div style={{ padding: '12px 0 4px', color: 'var(--text-muted)', fontSize: 14 }}>
            <span style={{ color: '#86efac', fontWeight: 700 }}>✓ {justLogged.slot.charAt(0).toUpperCase() + justLogged.slot.slice(1)} mood logged!</span>
            {nextSlot && <span> Next: <strong style={{ color: nextSlot.color }}>{nextSlot.icon} {nextSlot.label}</strong> — {slotTimeLabel(nextSlot.key)}</span>}
          </div>
        )}

        {/* No active slot */}
        {!allDone && !activeSlot && !justLogged && !loadingMood && (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {(() => {
              const h = new Date().getHours();
              if (h < 5) return <span>🌙 Check-in opens at <strong>5 AM</strong> — get some rest.</span>;
              if (nextSlot) return <span>{nextSlot.icon} Next check-in: <strong style={{ color: nextSlot.color }}>{nextSlot.label}</strong> — {slotTimeLabel(nextSlot.key)} <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>(or tap a slot above to log now)</span></span>;
              return <span>✓ All check-ins complete for today. See you tomorrow!</span>;
            })()}
          </div>
        )}

        {/* Active slot UI */}
        {!allDone && activeSlot && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{activeSlot.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: activeSlot.color }}>{activeSlot.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{activeSlot.prompt}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
                {slotTimeLabel(activeSlot.key)}
              </div>
            </div>
            <div className="mci-emojis" style={{ marginBottom: 14 }}>
              {MOOD_OPTIONS.map(({ score, emoji, label }) => (
                <button key={score}
                  className={`mci-emoji-btn${selectedScore === score ? ' selected' : ''}`}
                  onClick={() => setSelectedScore(score)}
                  style={selectedScore === score ? { borderColor: activeSlot.color, background: activeSlot.color + '22' } : {}}>
                  {emoji}<span>{label}</span>
                </button>
              ))}
            </div>
            {selectedScore && (
              <div style={{ marginBottom: 14 }}>
                <input type="text" className="form-input"
                  placeholder="Optional: what's on your mind?"
                  value={note} onChange={e => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} maxLength={200} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="auth-submit-btn"
                style={{ width: 'auto', padding: '10px 28px', marginBottom: 0, background: `linear-gradient(135deg, ${activeSlot.color}, ${activeSlot.color}cc)` }}
                onClick={submitMood} disabled={!selectedScore || submitting}>
                {submitting ? '⏳ Saving...' : `Log ${activeSlot.label.split(' ')[0]} Mood`}
              </button>
              {manualSlot && (
                <button onClick={() => { setManualSlot(null); setSelectedScore(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress row */}
        {!loadingMood && (
          <div style={{ display: 'flex', gap: 6, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', marginRight: 4 }}>Today:</span>
            {SLOTS.map(s => {
              const log = todayLogs.find(l => l.slot === s.key);
              const opt = log ? MOOD_OPTIONS.find(m => m.score === log.score) : null;
              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                  color: log ? s.color : 'var(--text-dim)', padding: '3px 8px', borderRadius: 20,
                  background: log ? `${s.color}15` : 'transparent',
                  border: `1px solid ${log ? s.color + '40' : 'var(--border)'}`,
                }}>
                  {s.icon} {log ? `${opt?.emoji} ${opt?.label}` : '—'}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Stats */}
      <div className="live-stats">
        {[
          { icon: '👥', value: loadingStats ? '...' : stats.users,      label: 'Registered Users' },
          { icon: '🙌', value: loadingStats ? '...' : stats.volunteers, label: 'Volunteers Available' },
          { icon: '🏥', value: loadingStats ? '...' : stats.slots,      label: 'Crisis Slots Open' },
          { icon: '💬', value: loadingStats ? '...' : stats.ventsToday, label: 'Vents Posted Today' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pillars */}
      <div className="pillars-section">
        <h2 className="section-title">How MindBridge Works</h2>
        <p className="section-subtitle">A stepped-care model designed to meet you exactly where you are</p>
        <div className="pillars-grid">
          <div className="pillar-card" onClick={() => navTo('vent')}>
            <div className="pillar-icon-wrap vent-gradient"><span className="pillar-icon">🌊</span></div>
            <div className="pillar-badge">Community</div>
            <h3 className="pillar-title">Vent Mode</h3>
            <p className="pillar-desc">Share anonymously. Be heard by a supportive community. AI monitors for distress and reaches out if you need more.</p>
            <ul className="pillar-features"><li>✓ 100% anonymous posting</li><li>✓ AI sentiment protection</li><li>✓ Community reactions</li></ul>
            <button className="pillar-cta vent-cta">Start Venting →</button>
          </div>
          <div className="pillar-card featured-pillar" onClick={() => navTo('help')}>
            <div className="pillar-badge-featured">Most Used</div>
            <div className="pillar-icon-wrap help-gradient"><span className="pillar-icon">🤝</span></div>
            <div className="pillar-badge">Volunteer-Led</div>
            <h3 className="pillar-title">I Need Help</h3>
            <p className="pillar-desc">Private one-on-one chat with trained NGO volunteers. If things escalate, get a warm handoff to a therapist.</p>
            <ul className="pillar-features"><li>✓ Trained peer support</li><li>✓ Private encrypted chat</li><li>✓ Smooth escalation path</li></ul>
            <button className="pillar-cta help-cta">Connect Now →</button>
          </div>
          <div className="pillar-card" onClick={() => navTo('journal')}>
            <div className="pillar-icon-wrap" style={{ background: 'rgba(20,184,166,0.2)' }}><span className="pillar-icon">📔</span></div>
            <div className="pillar-badge">Private Journal</div>
            <h3 className="pillar-title">Daily Journal</h3>
            <p className="pillar-desc">Write privately about your day, thoughts, and feelings. Your journal is completely personal and only visible to you.</p>
            <ul className="pillar-features"><li>✓ 100% private to you</li><li>✓ Mood-tagged entries</li><li>✓ Builds self-awareness</li></ul>
            <button className="pillar-cta" style={{ color: '#14b8a6' }}>Write Now →</button>
          </div>
        </div>
      </div>

      {/* Health Card Preview */}
      <div className="card-preview-section">
        <div className="card-preview-content">
          <h2 className="section-title">Your Digital Health Card</h2>
          <p className="section-subtitle">Every check-in, vent, and session builds your private health record — giving you continuity of care.</p>
          <button className="btn btn-primary" onClick={() => navTo('card')}>View My Health Card</button>
        </div>
        <div className="card-preview-visual">
          <div className="health-card-mock">
            <div className="hcm-header">
              <div className="hcm-avatar">📊</div>
              <div className="hcm-info">
                <div className="hcm-name">Today's Mood</div>
                <div className="hcm-id">{doneSlots.length} / 3 check-ins done</div>
              </div>
              <div className="hcm-safety safe">● Live</div>
            </div>
            <div className="mood-bar-wrap">
              <div className="mood-label">Check-in progress</div>
              <div className="mood-bars">
                {SLOTS.map((s, i) => {
                  const log = todayLogs.find(l => l.slot === s.key);
                  const h = log ? (log.score / 5) * 100 : 15;
                  return <div key={i} className={`mood-bar${log ? ' today' : ''}`} style={{ height: h + '%', background: log ? s.color : undefined }}></div>;
                })}
              </div>
            </div>
            <div className="hcm-tags">
              {SLOTS.map(s => {
                const log = todayLogs.find(l => l.slot === s.key);
                const opt = log ? MOOD_OPTIONS.find(m => m.score === log.score) : null;
                return <span key={s.key} className="hcm-tag">{s.icon} {log ? opt?.label : 'Pending'}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
