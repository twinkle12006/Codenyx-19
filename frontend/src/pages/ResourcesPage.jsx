import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function VideoModal({ resource, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{resource.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="aspect-video bg-black">
          {resource.videoUrl.includes('youtube') || resource.videoUrl.includes('youtu.be') ? (
            <iframe
              src={resource.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
              className="w-full h-full" allowFullScreen title={resource.title} />
          ) : (
            <video src={resource.videoUrl} controls className="w-full h-full" />
          )}
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">{resource.description}</p>
          <p className="text-xs text-sahara-600 font-mono mt-2">{resource.uploaderUsername}</p>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [playing, setPlaying] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', thumbnailUrl: '', tags: '' });
  const [loading, setLoading] = useState(true);

  const fetchResources = async () => {
    const res = await api.get('/resources' + (activeTag ? `?tag=${activeTag}` : ''));
    setResources(res.data);
    const allTags = [...new Set(res.data.flatMap(r => r.tags))];
    if (!activeTag) setTags(allTags);
    setLoading(false);
  };

  useEffect(() => { fetchResources(); }, [activeTag]);

  const toggleLike = async (id) => {
    const res = await api.post(`/resources/${id}/like`);
    setResources(prev => prev.map(r => r._id === id ? { ...r, likes: Array(res.data.likes).fill(null) } : r));
  };

  const submitResource = async (e) => {
    e.preventDefault();
    await api.post('/resources', {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setForm({ title: '', description: '', videoUrl: '', thumbnailUrl: '', tags: '' });
    setShowForm(false);
    fetchResources();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Resources</h1>
        {user?.role === 'volunteer' && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-sahara-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sahara-600">
            + Upload Video
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submitResource} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Upload a Resource</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Title" required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="Video URL (YouTube or direct)" required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            <input value={form.thumbnailUrl} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })}
              placeholder="Thumbnail URL (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (comma separated)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-2 focus:ring-sahara-300 resize-none" />
          <div className="flex gap-2 mt-3">
            <button type="submit" className="bg-sahara-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sahara-600">Upload</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Tag filters */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTag('')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${!activeTag ? 'bg-sahara-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-sahara-50'}`}>
            All
          </button>
          {tags.map(t => (
            <button key={t} onClick={() => setActiveTag(t)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${activeTag === t ? 'bg-sahara-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-sahara-50'}`}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : resources.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No resources yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-gray-100 cursor-pointer group" onClick={() => setPlaying(r)}>
                {r.thumbnailUrl ? (
                  <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sahara-100 to-sahara-200">
                    <span className="text-4xl">🎬</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-sahara-600 text-xl ml-1">▶</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-mono text-sahara-600">{r.uploaderUsername}</span>
                  <button onClick={() => toggleLike(r._id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors">
                    ❤️ {r.likes?.length || 0}
                  </button>
                </div>
                {r.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {playing && <VideoModal resource={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
