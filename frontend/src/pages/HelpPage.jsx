import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import ChatWindow from '../components/ChatWindow';
import RatingModal from '../components/RatingModal';

function StarDisplay({ avg, count }) {
  if (!avg) return <span className="text-xs text-gray-400">No ratings yet</span>;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-yellow-400">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
      <span className="text-gray-500">{avg} ({count})</span>
    </span>
  );
}

export default function HelpPage() {
  const socket = useSocket();
  const [volunteers, setVolunteers] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showRating, setShowRating] = useState(null); // { volunteerId, sessionId }

  const fetchVolunteers = async () => {
    const res = await api.get('/volunteers');
    setVolunteers(res.data);
  };

  const fetchActiveSession = async () => {
    const res = await api.get('/chat/user/active');
    setActiveSession(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVolunteers();
    fetchActiveSession();
  }, []);

  // Real-time volunteer status updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ volunteerId, isBusy }) => {
      setVolunteers(prev => prev.map(v =>
        v._id === volunteerId ? { ...v, isBusy } : v
      ));
    };
    socket.on('volunteer_status_change', handler);
    return () => socket.off('volunteer_status_change', handler);
  }, [socket]);

  const startChat = async (volunteerId) => {
    setConnecting(true);
    try {
      const res = await api.post('/chat/request', { volunteerId });
      setActiveSession(res.data);
      socket?.emit('set_busy', { isBusy: true }); // volunteer side handles this
    } catch (err) {
      alert(err.response?.data?.message || 'Could not connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleSessionEnd = () => {
    if (activeSession) {
      setShowRating({ volunteerId: activeSession.volunteerId?._id || activeSession.volunteerId, sessionId: activeSession._id });
    }
    setActiveSession(null);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Get Help</h1>

      {activeSession ? (
        <div className="h-[600px]">
          <ChatWindow
            sessionId={activeSession._id}
            onSessionEnd={handleSessionEnd}
            otherUsername={activeSession.volunteerId?.anonymousUsername || 'Volunteer'}
          />
        </div>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-6">
            Connect with a trained volunteer listener. All conversations are anonymous and confidential.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {volunteers.map(v => (
              <div key={v._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-sm font-semibold text-sahara-700">{v.anonymousUsername}</span>
                    <div className="mt-1">
                      <StarDisplay avg={v.avgRating} count={v.ratingCount} />
                    </div>
                  </div>
                  {v.isBusy ? (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
                      Busy · In session
                    </span>
                  ) : (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                      Available
                    </span>
                  )}
                </div>

                {v.bio && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{v.bio}</p>}

                {v.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {v.specialties.map(s => (
                      <span key={s} className="text-xs bg-sahara-50 text-sahara-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}

                {v.languages?.length > 0 && (
                  <p className="text-xs text-gray-400 mb-3">🌐 {v.languages.join(', ')}</p>
                )}

                <button
                  onClick={() => startChat(v._id)}
                  disabled={v.isBusy || connecting}
                  className="w-full bg-sahara-500 hover:bg-sahara-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm py-2 rounded-lg transition-colors font-medium">
                  {v.isBusy ? 'Busy' : connecting ? 'Connecting...' : 'Start Chat'}
                </button>
              </div>
            ))}
            {volunteers.length === 0 && (
              <div className="col-span-2 text-center text-gray-400 py-12">No volunteers available right now.</div>
            )}
          </div>
        </>
      )}

      {showRating && (
        <RatingModal
          volunteerId={showRating.volunteerId}
          sessionId={showRating.sessionId}
          onClose={() => setShowRating(null)}
        />
      )}
    </div>
  );
}
