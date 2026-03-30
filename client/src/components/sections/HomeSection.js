import React, { useState, useEffect, useCallback } from 'react';
import { getStats } from '../../api/auth';

export default function HomeSection({ navTo }) {
  const [ventsToday, setVentsToday] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getStats();
      setVentsToday(res.data.ventsToday || 0);
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const t = setInterval(fetchStats, 15000);
    return () => clearInterval(t);
  }, [fetchStats]);

  return (
    <section className="section active" id="section-home">

      {/* Hero */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-badge">🌱 NGO Mental Health Initiative</div>
          <h1 className="hero-title">You Are <span className="gradient-text">Never</span><br />Alone Here</h1>
          <p className="hero-subtitle">
            Sahara connects youth with the right level of support — from community peers to trained volunteers to licensed crisis therapists.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navTo('vent')}>Join Community</button>
            <button className="btn btn-ghost"   onClick={() => navTo('help')}>Find Support</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-cards-stack">
            <div className="mini-card mc-1"><span className="mc-icon">💜</span><div className="mc-text"><div className="mc-title">Community heard you</div><div className="mc-sub">Real reactions from real people</div></div></div>
            <div className="mini-card mc-2"><span className="mc-icon">🤝</span><div className="mc-text"><div className="mc-title">Volunteers ready</div><div className="mc-sub">Trained mentors available now</div></div></div>
            <div className="mini-card mc-3"><span className="mc-icon">💬</span><div className="mc-text"><div className="mc-title">Experiences shared</div><div className="mc-sub">{loadingStats ? '...' : ventsToday} posts today</div></div></div>
          </div>
        </div>
      </div>

      {/* Pillars */}
      <div className="pillars-section">
        <h2 className="section-title">How Sahara Works</h2>
        <p className="section-subtitle">A stepped-care model designed to meet you exactly where you are</p>
        <div className="pillars-grid">
          <div className="pillar-card" onClick={() => navTo('vent')}>
            <div className="pillar-icon-wrap vent-gradient"><span className="pillar-icon">🌊</span></div>
            <div className="pillar-badge">Community</div>
            <h3 className="pillar-title">Community</h3>
            <p className="pillar-desc">Share your experiences anonymously. Be heard, get likes, read comments from peers and trained volunteers.</p>
            <ul className="pillar-features">
              <li>✓ Anonymous posting</li>
              <li>✓ Like &amp; comment system</li>
              <li>✓ Volunteer blue-tick replies</li>
            </ul>
            <button className="pillar-cta vent-cta">Join Community →</button>
          </div>
          <div className="pillar-card featured-pillar" onClick={() => navTo('help')}>
            <div className="pillar-badge-featured">Most Used</div>
            <div className="pillar-icon-wrap help-gradient"><span className="pillar-icon">🤝</span></div>
            <div className="pillar-badge">Volunteer-Led</div>
            <h3 className="pillar-title">I Need Help</h3>
            <p className="pillar-desc">Private one-on-one chat with trained NGO volunteers. If things escalate, get a warm handoff to a therapist.</p>
            <ul className="pillar-features">
              <li>✓ Trained peer support</li>
              <li>✓ Private encrypted chat</li>
              <li>✓ Smooth escalation path</li>
            </ul>
            <button className="pillar-cta help-cta">Connect Now →</button>
          </div>
          <div className="pillar-card" onClick={() => navTo('journal')}>
            <div className="pillar-icon-wrap" style={{ background: 'rgba(20,184,166,0.2)' }}><span className="pillar-icon">📔</span></div>
            <div className="pillar-badge">Private Journal</div>
            <h3 className="pillar-title">Daily Journal</h3>
            <p className="pillar-desc">Write privately about your day, thoughts, and feelings. Your journal is completely personal and only visible to you.</p>
            <ul className="pillar-features">
              <li>✓ 100% private to you</li>
              <li>✓ Mood-tagged entries</li>
              <li>✓ Builds self-awareness</li>
            </ul>
            <button className="pillar-cta" style={{ color: '#14b8a6' }}>Write Now →</button>
          </div>
        </div>
      </div>

      {/* Health Card Preview */}
      <div className="card-preview-section">
        <div className="card-preview-content">
          <h2 className="section-title">Your Digital Health Card</h2>
          <p className="section-subtitle">Every session and journal entry builds your private health record — giving you continuity of care.</p>
          <button className="btn btn-primary" onClick={() => navTo('card')}>View My Health Card</button>
        </div>
        <div className="card-preview-visual">
          <div className="health-card-mock">
            <div className="hcm-header">
              <div className="hcm-avatar">💜</div>
              <div className="hcm-info">
                <div className="hcm-name">Your Safe Space</div>
                <div className="hcm-id">Sahara · Mental Health</div>
              </div>
              <div className="hcm-safety safe">● Live</div>
            </div>
            <div className="mood-bar-wrap">
              <div className="mood-label">Community Activity Today</div>
              <div className="mood-bars">
                {[40,55,35,65,50,75,80].map((h, i) => (
                  <div key={i} className={`mood-bar${i === 6 ? ' today' : ''}`} style={{ height: h + '%' }}></div>
                ))}
              </div>
            </div>
            <div className="hcm-tags">
              <span className="hcm-tag">� {loadingStats ? '...' : ventsToday} posts today</span>
              <span className="hcm-tag">🤝 Volunteers online</span>
              <span className="hcm-tag">🌱 Community</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
