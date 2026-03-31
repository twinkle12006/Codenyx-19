import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';

export default function MentorDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [unread, setUnread] = useState({});
  const [toast, setToast] = useState('');

  const fetchSessions = useCallback(async () => {
    const res = await api.get('/chat/mentor/active');
    setSessions(res.data);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Set volunteer as available on mount
  useEffect(() => {
    socket?.emit('set_busy', { isBusy: false });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onMsg = ({ sessionId, message }) => {
      setSessions(prev => prev.map(s => {
        if (s._id !== sessionId) return s;
        const msgs = [...(s.messages || []), message];
        return { ...s, messages: msgs };
      }));
      if (sessionId !== activeId) {
        setUnread(prev => ({ ...prev, [sessionId]: (prev[sessionId] || 0) + 1 }));
      }
    };

    const onEnded = ({ sessionId }) => {
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (activeId === sessionId) setActiveId(null);
      showToast('Session ended by user');
    };

    socket.on('new_message', onMsg);
    socket.on('session_ended', onEnded);
    return () => {
      socket.off('new_message', onMsg);
      socket.off('session_ended', onEnded);
    };
  }, [socket, activeId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const selectSession = (id) => {
    setActiveId(id);
    setUnread(prev => ({ ...prev, [id]: 0 }));
    socket?.emit('join_session', { sessionId: id });
    socket?.emit('set_busy', { isBusy: true });
  };

  const handleSessionEnd = () => {
    setSessions(prev => prev.filter(s => s._id !== activeId));
    setActiveId(null);
    socket?.emit('set_busy', { isBusy: false });
  };

  const activeSession = sessions.find(s => s._id === activeId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Volunteer Dashboard</h1>
        <span className="text-xs font-mono bg-sahara-100 text-sahara-700 px-3 py-1 rounded-full">
          {user?.anonymousUsername}
        </span>
      </div>

      {toast && (
        <div className="fixed top-20 right-4 bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 transition-all">
          {toast}
        </div>
      )}

      <div className="flex gap-4 h-[600px]">
        {/* Sidebar */}
        <div className="w-72 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Active Sessions ({sessions.length})</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No active sessions</div>
          ) : (
            sessions.map(s => {
              const lastMsg = s.messages?.[s.messages.length - 1];
              const uCount = unread[s._id] || 0;
              return (
                <button key={s._id} onClick={() => selectSession(s._id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-sahara-50 transition-colors ${activeId === s._id ? 'bg-sahara-50 border-l-2 border-l-sahara-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-sahara-700 truncate">
                      {s.userId?.anonymousUsername || 'User'}
                    </span>
                    {uCount > 0 && (
                      <span className="bg-sahara-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {uCount}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{lastMsg.text}</p>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1">
          {activeSession ? (
            <ChatWindow
              sessionId={activeId}
              onSessionEnd={handleSessionEnd}
              otherUsername={activeSession.userId?.anonymousUsername || 'User'}
            />
          ) : (
            <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Select a session to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
