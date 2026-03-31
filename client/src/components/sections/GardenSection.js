import React, { useEffect, useState } from 'react';
import { getHealthCard } from '../../api/auth';

// ── Garden computation from health data ──────────────────────────────────────
function computeGarden(d) {
  const s       = d.stats || {};
  const streak  = s.streak || 0;
  const avgMood = s.avgThis || 0;
  const checkins = d.totalCheckins || 0;
  const journals = d.journalCount || 0;
  const sessions = d.sessionCount || 0;
  const distress = d.distressScore ?? 5;
  const topMoods = d.topMoods || [];

  // Tree growth level 0-5 based on streak
  const treeLevel = Math.min(5, Math.floor(streak / 3));

  // Flowers: one per 3 check-ins, type based on dominant mood
  const flowerCount = Math.min(12, Math.floor(checkins / 3));
  const dominantMood = topMoods[0]?.label || 'Okay';
  const flowerEmoji = {
    'Great': '🌸', 'Good': '🌼', 'Okay': '🌻',
    'Low': '🌷', 'Very Low': '🌾',
  }[dominantMood] || '🌼';

  // Butterflies: one per journal entry (max 6)
  const butterflies = Math.min(6, journals);

  // Sun rays: one per session (max 8)
  const sunRays = Math.min(8, sessions);

  // Weather: clear sky if distress < 3, partly cloudy 3-6, stormy > 6
  const weather = distress <= 2 ? 'clear' : distress <= 5 ? 'partly' : 'cloudy';

  // Stars (rare): unlock at streak >= 14
  const hasStars = streak >= 14;

  // Rainbow: unlock at avgMood >= 4.5
  const hasRainbow = avgMood >= 4.5;

  // Animals: unlock at checkins >= 30
  const animals = checkins >= 30 ? ['🦋', '🐝'] : checkins >= 15 ? ['🐝'] : [];

  // Level title
  const level = streak === 0 ? 'Seedling' : streak < 3 ? 'Sprout' : streak < 7 ? 'Sapling' : streak < 14 ? 'Young Tree' : streak < 21 ? 'Blooming Tree' : 'Ancient Grove';

  // XP points
  const xp = checkins * 10 + journals * 15 + sessions * 20 + streak * 5;

  return { treeLevel, flowerCount, flowerEmoji, butterflies, sunRays, weather, hasStars, hasRainbow, animals, level, xp, streak, avgMood, checkins, journals, sessions, distress };
}

// ── Animated elements ─────────────────────────────────────────────────────────
function Sun({ rays }) {
  return (
    <div style={{ position: 'absolute', top: 24, right: 48, width: 64, height: 64 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'radial-gradient(circle, #fde68a, #f59e0b)', boxShadow: '0 0 40px rgba(245,158,11,0.6)', animation: 'spin 20s linear infinite' }} />
      {Array.from({ length: rays }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 20, background: 'rgba(253,230,138,0.7)', borderRadius: 2, transformOrigin: '50% -28px', transform: `rotate(${i * (360 / rays)}deg) translateX(-50%)`, animation: `pulse 2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

function Cloud({ x, y, size = 1, opacity = 0.7 }) {
  return (
    <div style={{ position: 'absolute', top: y, left: x, opacity, animation: `float ${6 + size}s ease-in-out infinite`, transform: `scale(${size})` }}>
      <div style={{ fontSize: 36 }}>☁️</div>
    </div>
  );
}

function Tree({ level }) {
  const trees = ['🌱', '🌿', '🌳', '🌲', '🎄', '🌴'];
  const sizes = [24, 32, 44, 56, 68, 80];
  return (
    <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', fontSize: sizes[level], animation: 'sway 4s ease-in-out infinite', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
      {trees[level]}
    </div>
  );
}

function Flower({ emoji, x, y, delay }) {
  return (
    <div style={{ position: 'absolute', bottom: y, left: x, fontSize: 20, animation: `bloom 0.5s ${delay}s both, sway ${3 + Math.random() * 2}s ${delay}s ease-in-out infinite`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
      {emoji}
    </div>
  );
}

function Butterfly({ x, y, delay }) {
  return (
    <div style={{ position: 'absolute', top: y, left: x, fontSize: 18, animation: `flutter 3s ${delay}s ease-in-out infinite`, opacity: 0.9 }}>
      🦋
    </div>
  );
}

function Stars() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${10 + Math.random() * 30}%`, left: `${5 + i * 12}%`, fontSize: 14, animation: `twinkle ${1.5 + Math.random()}s ${Math.random()}s ease-in-out infinite`, opacity: 0.8 }}>⭐</div>
      ))}
    </>
  );
}

function Rainbow() {
  return (
    <div style={{ position: 'absolute', top: 60, left: '10%', width: '80%', height: 80, borderRadius: '50% 50% 0 0', background: 'linear-gradient(180deg, rgba(239,68,68,0.3), rgba(249,115,22,0.3), rgba(234,179,8,0.3), rgba(34,197,94,0.3), rgba(59,130,246,0.3), rgba(139,92,246,0.3))', opacity: 0.6, animation: 'fadeIn 2s ease-in' }} />
  );
}

// ── Main Garden Component ─────────────────────────────────────────────────────
export default function GardenSection({ user }) {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [soundOn, setSoundOn]   = useState(false);
  const [shared, setShared]     = useState(false);

  useEffect(() => {
    getHealthCard()
      .then(r => setCardData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const garden = cardData ? computeGarden(cardData) : null;

  // Flower positions (pre-computed to avoid re-render jitter)
  const flowerPositions = React.useMemo(() => {
    if (!garden) return [];
    return Array.from({ length: garden.flowerCount }).map((_, i) => ({
      x: `${5 + (i % 6) * 15 + Math.sin(i) * 5}%`,
      y: 60 + Math.cos(i) * 15,
      delay: i * 0.1,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden?.flowerCount]);

  const butterflyPositions = React.useMemo(() => {
    if (!garden) return [];
    return Array.from({ length: garden.butterflies }).map((_, i) => ({
      x: `${10 + i * 14}%`,
      y: `${20 + Math.sin(i) * 15}%`,
      delay: i * 0.5,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden?.butterflies]);

  if (loading) return (
    <section className="section active">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: 'spin 2s linear infinite' }}>🌱</div>
        Growing your garden...
      </div>
    </section>
  );

  if (!garden) return null;

  const skyColors = {
    clear:   'linear-gradient(180deg, #1e3a5f 0%, #0f4c2a 100%)',
    partly:  'linear-gradient(180deg, #2d3561 0%, #1a3a2a 100%)',
    cloudy:  'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
  };

  return (
    <section className="section active" id="section-garden">
      {/* CSS keyframes injected inline */}
      <style>{`
        @keyframes sway { 0%,100%{transform:translateX(-50%) rotate(-2deg)} 50%{transform:translateX(-50%) rotate(2deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes bloom { from{transform:scale(0) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }
        @keyframes flutter { 0%,100%{transform:translate(0,0) rotate(-5deg)} 25%{transform:translate(10px,-15px) rotate(5deg)} 75%{transform:translate(-8px,-8px) rotate(-3deg)} }
        @keyframes twinkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:0.6} }
        @keyframes grassWave { 0%,100%{transform:scaleY(1) rotate(-1deg)} 50%{transform:scaleY(1.05) rotate(1deg)} }
      `}</style>

      <div className="section-header">
        <div className="section-header-content">
          <div className="sh-icon" style={{ background: 'rgba(34,197,94,0.15)', fontSize: 24 }}>🌱</div>
          <div>
            <h1 className="sh-title">My Sahara Garden</h1>
            <p className="sh-subtitle">Your mental wellness journey, growing one day at a time.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setSoundOn(s => !s)} className="btn btn-outline" style={{ fontSize: 13 }}>
            {soundOn ? '🔇 Mute' : '🎵 Ambience'}
          </button>
          <button onClick={() => setShared(true)} className="btn btn-outline" style={{ fontSize: 13 }}>
            📤 Share Garden
          </button>
        </div>
      </div>

      {/* ── Level + XP bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 32 }}>🏆</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#86efac' }}>{garden.level}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{garden.xp} XP</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (garden.xp % 500) / 5)}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)', borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            {garden.streak} day streak · {garden.checkins} check-ins · {garden.journals} journal entries
          </div>
        </div>
      </div>

      {/* ── The Garden Canvas ── */}
      <div style={{ position: 'relative', width: '100%', height: 380, borderRadius: 20, overflow: 'hidden', background: skyColors[garden.weather], border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>

        {/* Rainbow (rare unlock) */}
        {garden.hasRainbow && <Rainbow />}

        {/* Stars (rare unlock) */}
        {garden.hasStars && <Stars />}

        {/* Sun */}
        <Sun rays={garden.sunRays || 4} />

        {/* Clouds */}
        {garden.weather !== 'clear' && <>
          <Cloud x="10%" y={30} size={0.8} opacity={0.5} />
          <Cloud x="40%" y={20} size={1.1} opacity={0.6} />
          {garden.weather === 'cloudy' && <Cloud x="65%" y={40} size={0.9} opacity={0.7} />}
        </>}

        {/* Butterflies */}
        {butterflyPositions.map((b, i) => <Butterfly key={i} x={b.x} y={b.y} delay={b.delay} />)}

        {/* Ground */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(180deg, #14532d, #166534)', borderRadius: '0 0 20px 20px' }} />
        <div style={{ position: 'absolute', bottom: 85, left: 0, right: 0, height: 20, background: 'rgba(34,197,94,0.3)', filter: 'blur(4px)' }} />

        {/* Grass tufts */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', bottom: 82, left: `${i * 6.5}%`, fontSize: 18, animation: `grassWave ${2 + i * 0.1}s ease-in-out infinite` }}>🌿</div>
        ))}

        {/* Flowers */}
        {flowerPositions.map((f, i) => <Flower key={i} emoji={garden.flowerEmoji} x={f.x} y={f.y} delay={f.delay} />)}

        {/* Main Tree */}
        <Tree level={garden.treeLevel} />

        {/* Animals */}
        {garden.animals.map((a, i) => (
          <div key={i} style={{ position: 'absolute', bottom: 90, left: `${30 + i * 20}%`, fontSize: 20, animation: `flutter ${4 + i}s ${i * 0.5}s ease-in-out infinite` }}>{a}</div>
        ))}

        {/* Empty state hint */}
        {garden.checkins === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '0 40px' }}>
              Start logging your mood daily to grow your garden 🌱
            </div>
          </div>
        )}
      </div>

      {/* ── Achievement badges ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🌱', label: 'First Seed',     desc: 'Log your first mood',       unlocked: garden.checkins >= 1 },
          { icon: '🔥', label: '7-Day Streak',   desc: '7 consecutive check-ins',   unlocked: garden.streak >= 7 },
          { icon: '📔', label: 'Journaler',       desc: 'Write 5 journal entries',   unlocked: garden.journals >= 5 },
          { icon: '🤝', label: 'Reached Out',     desc: 'Complete a mentor session', unlocked: garden.sessions >= 1 },
          { icon: '🌸', label: 'Blooming',        desc: 'Avg mood ≥ 4 this week',    unlocked: garden.avgMood >= 4 },
          { icon: '🌈', label: 'Rainbow Day',     desc: 'Avg mood ≥ 4.5 this week',  unlocked: garden.hasRainbow },
          { icon: '⭐', label: 'Star Gazer',      desc: '14-day streak',             unlocked: garden.hasStars },
          { icon: '🌳', label: 'Ancient Grove',   desc: '21-day streak',             unlocked: garden.streak >= 21 },
        ].map(badge => (
          <div key={badge.label} style={{ padding: '14px 16px', borderRadius: 12, background: badge.unlocked ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${badge.unlocked ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`, opacity: badge.unlocked ? 1 : 0.45, transition: 'all 0.3s' }}>
            <div style={{ fontSize: 24, marginBottom: 6, filter: badge.unlocked ? 'none' : 'grayscale(1)' }}>{badge.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: badge.unlocked ? '#86efac' : 'var(--text-muted)' }}>{badge.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{badge.desc}</div>
            {badge.unlocked && <div style={{ fontSize: 10, color: '#86efac', marginTop: 4, fontWeight: 600 }}>✓ Unlocked</div>}
          </div>
        ))}
      </div>

      {/* ── Garden stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { icon: '🌸', label: 'Flowers Grown',  value: garden.flowerCount },
          { icon: '🦋', label: 'Butterflies',    value: garden.butterflies },
          { icon: '☀️', label: 'Sun Rays',        value: garden.sunRays },
          { icon: '🌿', label: 'Garden Level',   value: garden.treeLevel + 1 },
        ].map(s => (
          <div key={s.label} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#86efac', marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Share modal */}
      {shared && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShared(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">🌱 Share Your Garden</h3>
              <button className="modal-close" onClick={() => setShared(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌳</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{garden.level}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {garden.streak} day streak · {garden.xp} XP · {garden.flowerCount} flowers
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  Your garden snapshot is anonymized — no personal data is shared. It shows only your growth level and streak.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(`🌱 My Sahara Garden: ${garden.level} · ${garden.streak}-day streak · ${garden.xp} XP`); setShared(false); }}>
                📋 Copy to Clipboard
              </button>
              <button className="btn btn-ghost" onClick={() => setShared(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
