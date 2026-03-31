import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Volunteer profile state
  const [bio, setBio] = useState(user?.bio || '');
  const [specialties, setSpecialties] = useState(user?.specialties?.join(', ') || '');
  const [languages, setLanguages] = useState(user?.languages?.join(', ') || '');

  const canRegenerate = () => {
    if (!user?.anonymousUsernameLastChanged) return true;
    const diff = Date.now() - new Date(user.anonymousUsernameLastChanged).getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000;
  };

  const daysUntilRegen = () => {
    if (!user?.anonymousUsernameLastChanged) return 0;
    const diff = Date.now() - new Date(user.anonymousUsernameLastChanged).getTime();
    return Math.ceil(7 - diff / (1000 * 60 * 60 * 24));
  };

  const regenerateUsername = async () => {
    setLoading(true);
    setMsg('');
    setError('');
    try {
      await api.post('/auth/regenerate-username');
      await refreshUser();
      setMsg('Username regenerated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  };

  const saveVolunteerProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError('');
    try {
      await api.put('/volunteers/profile', {
        bio,
        specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
        languages: languages.split(',').map(l => l.trim()).filter(Boolean)
      });
      await refreshUser();
      setMsg('Profile updated!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {msg && <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg mb-4">{msg}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      {/* Anonymous Username */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Anonymous Identity</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-lg text-sahara-600 bg-sahara-50 px-4 py-2 rounded-lg">
            {user?.anonymousUsername}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          This is the only name others see. You can regenerate it once every 7 days.
        </p>
        <button
          onClick={regenerateUsername}
          disabled={!canRegenerate() || loading}
          className="bg-sahara-500 hover:bg-sahara-600 disabled:bg-gray-100 disabled:text-gray-400 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          {canRegenerate() ? 'Regenerate Username' : `Available in ${daysUntilRegen()} day(s)`}
        </button>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Account</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Role</span>
            <span className="capitalize font-medium text-gray-700">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span>Member since</span>
            <span className="font-medium text-gray-700">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Volunteer profile */}
      {user?.role === 'volunteer' && (
        <form onSubmit={saveVolunteerProfile} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Volunteer Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Tell users a bit about yourself..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Specialties (comma separated)</label>
              <input value={specialties} onChange={e => setSpecialties(e.target.value)}
                placeholder="e.g. Anxiety, Depression, Grief"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Languages (comma separated)</label>
              <input value={languages} onChange={e => setLanguages(e.target.value)}
                placeholder="e.g. English, Hindi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-4 bg-sahara-500 hover:bg-sahara-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
