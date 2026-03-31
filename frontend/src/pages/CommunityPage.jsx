import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function ReplyItem({ reply, ventId, commentId, depth = 0 }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(reply.likes?.length || 0);
  const [dislikes, setDislikes] = useState(reply.dislikes?.length || 0);

  const vote = async (type) => {
    const res = await api.post(`/vents/${ventId}/comments/${commentId}/replies/${reply._id}/${type}`);
    setLikes(res.data.likes);
    setDislikes(res.data.dislikes);
  };

  return (
    <div className={`mt-2 ${depth > 0 ? 'ml-4 border-l-2 border-sahara-100 pl-3' : ''}`}>
      <div className="bg-sahara-50 rounded-lg p-3">
        <span className="text-xs font-mono text-sahara-600 font-semibold">{reply.anonymousUsername}</span>
        <p className="text-sm text-gray-700 mt-1">{reply.text}</p>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => vote('like')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-500">
            👍 {likes}
          </button>
          <button onClick={() => vote('dislike')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400">
            👎 {dislikes}
          </button>
          <span className="text-xs text-gray-300">{new Date(reply.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {reply.replies?.map(r => (
        <ReplyItem key={r._id} reply={r} ventId={ventId} commentId={commentId} depth={depth + 1} />
      ))}
    </div>
  );
}

function CommentItem({ comment, ventId, onUpdate }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(comment.likes?.length || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes?.length || 0);
  const [showReply, setShowReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');

  const vote = async (type) => {
    const res = await api.post(`/vents/${ventId}/comments/${comment._id}/${type}`);
    setLikes(res.data.likes);
    setDislikes(res.data.dislikes);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await api.post(`/vents/${ventId}/comments/${comment._id}/reply`, { text: replyText });
    setReplyText('');
    setShowReply(false);
    onUpdate();
  };

  return (
    <div className="border-l-2 border-sahara-200 pl-4 mt-3">
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <span className="text-xs font-mono text-sahara-600 font-semibold">{comment.anonymousUsername}</span>
        <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <button onClick={() => vote('like')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-500">
            👍 {likes}
          </button>
          <button onClick={() => vote('dislike')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400">
            👎 {dislikes}
          </button>
          <button onClick={() => setShowReply(!showReply)} className="text-xs text-sahara-500 hover:underline">
            Reply
          </button>
          {comment.replies?.length > 0 && (
            <button onClick={() => setShowReplies(!showReplies)} className="text-xs text-gray-400 hover:underline">
              {showReplies ? 'Hide' : `Show ${comment.replies.length} repl${comment.replies.length === 1 ? 'y' : 'ies'}`}
            </button>
          )}
          <span className="text-xs text-gray-300">{new Date(comment.createdAt).toLocaleDateString()}</span>
        </div>

        {showReply && (
          <form onSubmit={submitReply} className="mt-2 flex gap-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sahara-300" />
            <button type="submit" className="bg-sahara-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-sahara-600">
              Send
            </button>
          </form>
        )}
      </div>

      {showReplies && comment.replies?.map(r => (
        <ReplyItem key={r._id} reply={r} ventId={ventId} commentId={comment._id} />
      ))}
    </div>
  );
}

function VentCard({ vent, onUpdate }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(vent.likes?.length || 0);
  const [dislikes, setDislikes] = useState(vent.dislikes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const vote = async (type) => {
    const res = await api.post(`/vents/${vent._id}/${type}`);
    setLikes(res.data.likes);
    setDislikes(res.data.dislikes);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await api.post(`/vents/${vent._id}/comments`, { text: commentText });
    setCommentText('');
    onUpdate();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono bg-sahara-100 text-sahara-700 px-2 py-0.5 rounded-full">
          {vent.anonymousUsername}
        </span>
        <span className="text-xs text-gray-400">{new Date(vent.createdAt).toLocaleDateString()}</span>
      </div>
      {vent.title && <h3 className="font-semibold text-gray-800 mb-1">{vent.title}</h3>}
      <p className="text-gray-600 text-sm leading-relaxed">{vent.content}</p>

      {vent.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {vent.tags.map(t => (
            <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
        <button onClick={() => vote('like')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-green-500 transition-colors">
          👍 {likes}
        </button>
        <button onClick={() => vote('dislike')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors">
          👎 {dislikes}
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-sahara-500 transition-colors">
          💬 {vent.comments?.length || 0}
        </button>
      </div>

      {showComments && (
        <div className="mt-4">
          <form onSubmit={submitComment} className="flex gap-2 mb-4">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            <button type="submit" className="bg-sahara-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sahara-600">
              Post
            </button>
          </form>
          {vent.comments?.map(c => (
            <CommentItem key={c._id} comment={c} ventId={vent._id} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [vents, setVents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [loading, setLoading] = useState(true);

  const fetchVents = async () => {
    const res = await api.get('/vents');
    setVents(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchVents(); }, []);

  const submitVent = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    await api.post('/vents', {
      title: form.title,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setForm({ title: '', content: '', tags: '' });
    setShowForm(false);
    fetchVents();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Community</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-sahara-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sahara-600 transition-colors">
          + Share
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitVent} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Share what's on your mind</h2>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sahara-300" />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="What's on your mind?" rows={4} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sahara-300 resize-none" />
          <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="Tags (comma separated, e.g. anxiety, stress)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sahara-300" />
          <div className="flex gap-2">
            <button type="submit" className="bg-sahara-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sahara-600">Post</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 px-4 py-2 hover:text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : vents.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No posts yet. Be the first to share.</div>
      ) : (
        <div className="space-y-4">
          {vents.map(v => <VentCard key={v._id} vent={v} onUpdate={fetchVents} />)}
        </div>
      )}
    </div>
  );
}
