import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getVents, postVent, likeVent, dislikeVent, commentVent, deleteComment, likeComment, dislikeComment } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const moodEmoji = { anxious: '😰', sad: '😢', overwhelmed: '😵', hopeful: '🌱', angry: '😤', numb: '😶' };
const ANON_NAMES  = ['Quiet Star','Fading Light','Open Sky','Silver Cloud','Ember Glow','Distant Shore','Rising Tide','Velvet Night'];
const ANON_COLORS = ['#6366f1','#8b5cf6','#14b8a6','#f59e0b','#f43f5e','#22c55e'];

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function VentCard({ v, userId, onLike, onDislike, onComment, onDeleteComment, onLikeComment, onDislikeComment, navTo }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const liked    = v.likedBy?.includes(userId);
  const disliked = v.dislikedBy?.includes(userId);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await onComment(v._id, commentText.trim());
    setCommentText('');
    setSubmitting(false);
  };

  return (
    <div className={`vent-card${v.distress > 0.7 ? ' flagged' : ''}`}>
      {v.distress > 0.7 && <div className="vc-ai-flag">🤖 High distress</div>}
      <div className="vc-header">
        <div className="vc-anon" style={{ background: v.color + '22', color: v.color }}>{v.anon.charAt(0)}</div>
        <div className="vc-meta">
          <div className="vc-username">{v.anon}</div>
          <div className="vc-time">{timeAgo(v.createdAt)}</div>
        </div>
        <span className={`vc-mood-tag mood-${v.mood}`}>
          {moodEmoji[v.mood] || '😶'} {v.mood.charAt(0).toUpperCase() + v.mood.slice(1)}
        </span>
      </div>

      <p className="vc-text">{v.text}</p>

      <div className="vc-reactions" style={{ gap: 8 }}>
        <button className={`reaction-btn${liked ? ' reacted' : ''}`} onClick={() => onLike(v._id)}
          style={liked ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)', color: '#86efac' } : {}}>
          👍 <span>{v.likes || 0}</span>
        </button>
        <button className={`reaction-btn${disliked ? ' reacted' : ''}`} onClick={() => onDislike(v._id)}
          style={disliked ? { background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.4)', color: '#fca5a5' } : {}}>
          👎 <span>{v.dislikes || 0}</span>
        </button>
        <button className="reaction-btn" onClick={() => setShowComments(s => !s)}>
          💬 <span>{v.comments?.length || 0}</span>
        </button>
        {v.mentorReplies > 0 && (
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, padding:'5px 10px', borderRadius:20,
            background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontWeight:600 }}>
            🌱 {v.mentorReplies} volunteer {v.mentorReplies === 1 ? 'reply' : 'replies'}
          </span>
        )}
        {v.distress > 0.7 && (
          <button className="reaction-btn" style={{ marginLeft:'auto', color:'#c4b5fd' }} onClick={() => navTo && navTo('help')}>
            🤝 Offer support
          </button>
        )}
      </div>

      {showComments && (
        <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:14 }}>
          {v.comments?.length === 0 && (
            <div style={{ fontSize:13, color:'var(--text-dim)', marginBottom:12 }}>No comments yet. Be the first to share your experience.</div>
          )}
          {v.comments?.map(c => (
            <div key={c._id} style={{ display:'flex', gap:10, marginBottom:12, padding:'10px 12px', borderRadius:10,
              background: c.isMentor ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
              border:`1px solid ${c.isMentor ? 'rgba(99,102,241,0.2)' : 'var(--border)'}` }}>
              <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                background: c.isMentor ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white' }}>
                {c.userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{c.isMentor ? 'Anonymous' : c.userName}</span>
                  {c.isMentor && (
                    <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, fontWeight:700,
                      background:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)' }}>
                      ✓ Volunteer
                    </span>
                  )}
                  <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:'auto' }}>{timeAgo(c.createdAt)}</span>
                  {c.userId === userId && (
                    <button onClick={() => onDeleteComment(v._id, c._id)}
                      style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12 }}>×</button>
                  )}
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{c.text}</div>
                {/* Comment like/dislike */}
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <button onClick={() => onLikeComment(v._id, c._id)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, fontSize:11, cursor:'pointer',
                      background: c.likedBy?.includes(userId) ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${c.likedBy?.includes(userId) ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                      color: c.likedBy?.includes(userId) ? '#86efac' : 'var(--text-dim)' }}>
                    👍 {c.likes || 0}
                  </button>
                  <button onClick={() => onDislikeComment(v._id, c._id)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, fontSize:11, cursor:'pointer',
                      background: c.dislikedBy?.includes(userId) ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${c.dislikedBy?.includes(userId) ? 'rgba(244,63,94,0.4)' : 'var(--border)'}`,
                      color: c.dislikedBy?.includes(userId) ? '#fca5a5' : 'var(--text-dim)' }}>
                    👎 {c.dislikes || 0}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <input type="text" className="chat-input"
              placeholder="Share your experience or support..."
              value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyUp={e => e.key === 'Enter' && handleComment()}
              style={{ flex:1, borderRadius:20, padding:'8px 16px', fontSize:13 }} maxLength={500} />
            <button className="send-btn" onClick={handleComment} disabled={submitting || !commentText.trim()}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VentSection({ navTo }) {
  const { user } = useAuth();
  const userId   = user?.id || user?._id || '';

  const [vents, setVents]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [sortBy, setSortBy]             = useState('new');
  const [modalOpen, setModalOpen]       = useState(false);
  const [ventText, setVentText]         = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [distressLevel, setDistressLevel] = useState(0);
  const [distressBanner, setDistressBanner] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [newVentBanner, setNewVentBanner] = useState(false);
  const [suspendedModal, setSuspendedModal] = useState(false);
  const latestIdRef = useRef(null);

  const fetchVents = useCallback(async (silent = false) => {
    try {
      const res = await getVents();
      const data = res.data;
      if (!silent) {
        setVents(data);
        if (data.length > 0) latestIdRef.current = data[0]._id;
      } else if (data.length > 0 && data[0]._id !== latestIdRef.current) {
        setVents(data);
        latestIdRef.current = data[0]._id;
        setNewVentBanner(true);
        setTimeout(() => setNewVentBanner(false), 5000);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVents(false); }, [fetchVents]);
  useEffect(() => {
    const t = setInterval(() => fetchVents(true), 5000);
    return () => clearInterval(t);
  }, [fetchVents]);

  const analyzeText = (text) => {
    const words = ['cant',"can't",'hopeless','worthless','hurt','pain','die','end it','give up','nobody','alone','scared','suicidal','numb','lost','broken','exhausted'];
    setDistressLevel(Math.min(words.filter(w => text.toLowerCase().includes(w)).length / 3, 1));
  };

  const submitVent = async () => {
    if (!ventText.trim()) return;
    setSubmitting(true);
    const i = Math.floor(Math.random() * ANON_NAMES.length);
    try {
      const res = await postVent({ anon: ANON_NAMES[i], color: ANON_COLORS[i % ANON_COLORS.length],
        mood: selectedMood || 'numb', text: ventText.trim(), distress: distressLevel });
      setVents(v => [res.data, ...v]);
      latestIdRef.current = res.data._id;
      setModalOpen(false); setVentText(''); setSelectedMood(''); setDistressLevel(0);
      if (distressLevel > 0.6) setTimeout(() => setDistressBanner(true), 1200);
    } catch (e) { alert(e.response?.data?.message || 'Failed to post.'); }
    finally { setSubmitting(false); }
  };

  const handleLike    = async (id) => { try { const r = await likeVent(id);    setVents(v => v.map(x => x._id === id ? r.data : x)); } catch {} };
  const handleDislike = async (id) => { try { const r = await dislikeVent(id); setVents(v => v.map(x => x._id === id ? r.data : x)); } catch {} };
  const handleComment = async (id, text) => {
    try {
      const r = await commentVent(id, text);
      setVents(v => v.map(x => x._id === id ? r.data : x));
    } catch (err) {
      const data = err.response?.data;
      if (data?.flagged) {
        setSuspendedModal(true);
      }
    }
  };
  const handleDeleteComment = async (vid, cid) => { try { const r = await deleteComment(vid, cid); setVents(v => v.map(x => x._id === vid ? r.data : x)); } catch {} };
  const handleLikeComment    = async (vid, cid) => { try { const r = await likeComment(vid, cid);    setVents(v => v.map(x => x._id === vid ? r.data : x)); } catch {} };
  const handleDislikeComment = async (vid, cid) => { try { const r = await dislikeComment(vid, cid); setVents(v => v.map(x => x._id === vid ? r.data : x)); } catch {} };
  let filtered = filter === 'all' ? vents : vents.filter(v => v.mood === filter);
  if (sortBy === 'top') filtered = [...filtered].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));

  const meterColor = distressLevel === 0 ? '#22c55e' : distressLevel < 0.4 ? '#f59e0b' : distressLevel < 0.7 ? '#f97316' : '#f43f5e';
  const meterText  = distressLevel === 0 ? 'AI is listening and here if you need support...'
    : distressLevel < 0.4 ? "We notice some stress. Remember you're not alone here."
    : distressLevel < 0.7 ? '⚠️ We hear you. This sounds really heavy — our volunteers are here.'
    : '🆘 This sounds very serious. Would you like help right now?';

  return (
    <section className="section active" id="section-vent">
      <div className="section-header">
        <div className="section-header-content">
          <div className="sh-icon vent-icon-bg">🌊</div>
          <div>
            <h1 className="sh-title">Community</h1>
            <p className="sh-subtitle">Share your experiences anonymously. Support each other. Volunteers are here too.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Share Experience</button>
      </div>

      {newVentBanner && (
        <div className="alert-banner" style={{ background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', marginBottom:16 }}>
          <div className="alert-icon">🌊</div>
          <div className="alert-content">Someone just shared a new experience — feed updated.</div>
          <button className="alert-close" onClick={() => setNewVentBanner(false)}>×</button>
        </div>
      )}

      {distressBanner && (
        <div className="alert-banner distress-banner">
          <div className="alert-icon">💜</div>
          <div className="alert-content"><strong>Hey, we noticed your post sounds really heavy.</strong> Would you like to talk to a trained volunteer?</div>
          <button className="alert-cta" onClick={() => navTo && navTo('help')}>Connect Now</button>
          <button className="alert-close" onClick={() => setDistressBanner(false)}>×</button>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div className="mood-filters" style={{ marginBottom:0 }}>
          {[['all','All'],['anxious','😰 Anxious'],['sad','😢 Sad'],['overwhelmed','😵 Overwhelmed'],['hopeful','🌱 Hopeful'],['angry','😤 Angry']].map(([key, label]) => (
            <button key={key} className={`filter-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`filter-btn${sortBy === 'new' ? ' active' : ''}`} onClick={() => setSortBy('new')}>🕐 New</button>
          <button className={`filter-btn${sortBy === 'top' ? ' active' : ''}`} onClick={() => setSortBy('top')}>🔥 Top</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🌊</div>Loading community...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>💜</div>
          {filter === 'all' ? 'No posts yet. Be the first to share.' : `No ${filter} posts yet.`}
        </div>
      ) : (
        <div className="vent-feed">
          {filtered.map(v => (
            <VentCard key={v._id} v={v} userId={userId}
              onLike={handleLike} onDislike={handleDislike}
              onComment={handleComment} onDeleteComment={handleDeleteComment}
              onLikeComment={handleLikeComment} onDislikeComment={handleDislikeComment}
              navTo={navTo} />
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box vent-modal-box">
            <div className="modal-header">
              <h3 className="modal-title">🌊 Share Your Experience</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="vent-reminder">This is anonymous. No one will know it's you. Say whatever you need to say. 💜</p>
              <div style={{ marginBottom:16 }}>
                <label className="mood-label-title">How are you feeling?</label>
                <div className="mood-options">
                  {['anxious','sad','overwhelmed','hopeful','angry','numb'].map(m => (
                    <button key={m} className={`mood-opt${selectedMood === m ? ' selected' : ''}`} onClick={() => setSelectedMood(m)}>
                      {moodEmoji[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <textarea className="vent-textarea" placeholder="What's on your mind? Let it out..."
                value={ventText} onChange={e => { setVentText(e.target.value); analyzeText(e.target.value); }} />
              <div className="ai-sentiment-bar">
                <div className="ai-icon">🤖</div>
                <div className="ai-text">{meterText}</div>
                <div className="ai-meter-wrap">
                  <div className="ai-meter" style={{ width:(distressLevel * 100)+'%', background:meterColor }}></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={submitVent} disabled={submitting || !ventText.trim()}>
                {submitting ? '⏳ Posting...' : 'Post Anonymously'}
              </button>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Abuse warning modal */}
      {suspendedModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 className="modal-title" style={{ color: '#fcd34d' }}>Comment Blocked</h3>
            <div className="modal-body">
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)' }}>
                Your comment was detected as abusive and has been blocked.<br /><br />
                This incident has been <strong style={{ color: '#fca5a5' }}>reported to the admin</strong> for review.<br /><br />
                Repeated violations may result in your account being deactivated.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setSuspendedModal(false)}>I understand</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
