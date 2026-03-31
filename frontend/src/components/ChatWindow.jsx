import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function TickMark({ msg, currentUserId }) {
  if (msg.senderId?.toString() !== currentUserId?.toString()) return null;
  if (msg.readAt) return <span className="text-blue-400 text-xs ml-1">✓✓</span>;
  if (msg.deliveredAt) return <span className="text-gray-400 text-xs ml-1">✓✓</span>;
  return <span className="text-gray-300 text-xs ml-1">✓</span>;
}

export default function ChatWindow({ sessionId, onSessionEnd, otherUsername }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [ended, setEnded] = useState(false);
  const [deliveredIds, setDeliveredIds] = useState(new Set());
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadSession = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${sessionId}`);
      setSession(res.data);
      setMessages(res.data.messages || []);
      if (res.data.ended) setEnded(true);
      // Mark as read
      socket?.emit('mark_read', { sessionId });
    } catch {}
  }, [sessionId, socket]);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_session', { sessionId });

    const onMsg = ({ sessionId: sid, message }) => {
      if (sid !== sessionId) return;
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      socket.emit('mark_read', { sessionId });
    };

    const onDelivered = ({ messageId }) => {
      setDeliveredIds(prev => new Set([...prev, messageId]));
    };

    const onRead = ({ sessionId: sid }) => {
      if (sid !== sessionId) return;
      setMessages(prev => prev.map(m => ({ ...m, readAt: m.readAt || new Date() })));
    };

    const onTyping = ({ sessionId: sid }) => {
      if (sid !== sessionId) return;
      setTyping(true);
    };

    const onStopTyping = ({ sessionId: sid }) => {
      if (sid !== sessionId) return;
      setTyping(false);
    };

    const onEnded = ({ sessionId: sid }) => {
      if (sid !== sessionId) return;
      setEnded(true);
      onSessionEnd?.();
    };

    socket.on('new_message', onMsg);
    socket.on('message_delivered', onDelivered);
    socket.on('messages_read', onRead);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);
    socket.on('session_ended', onEnded);

    return () => {
      socket.off('new_message', onMsg);
      socket.off('message_delivered', onDelivered);
      socket.off('messages_read', onRead);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
      socket.off('session_ended', onEnded);
    };
  }, [socket, sessionId]);

  const handleInput = (e) => {
    setText(e.target.value);
    socket?.emit('typing', { sessionId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('stop_typing', { sessionId }), 1500);
  };

  const sendMessage = () => {
    if (!text.trim() || ended) return;
    socket?.emit('send_message', { sessionId, text: text.trim() });
    setText('');
    socket?.emit('stop_typing', { sessionId });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const endSession = () => {
    socket?.emit('end_session', { sessionId });
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== lastDate) { grouped.push({ type: 'separator', date: msg.createdAt }); lastDate = d; }
    grouped.push({ type: 'message', msg });
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-sahara-50">
        <div>
          <span className="font-semibold text-gray-800 text-sm">{otherUsername || 'Chat'}</span>
          {ended && <span className="ml-2 text-xs text-red-400">Session ended</span>}
        </div>
        {!ended && (
          <button onClick={endSession}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1 rounded-lg transition-colors">
            End Session
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {grouped.map((item, i) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${i}`} className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{formatDateSeparator(item.date)}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            );
          }
          const { msg } = item;
          const isMine = msg.senderId?.toString() === user._id?.toString();
          return (
            <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                isMine ? 'bg-sahara-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-xs ${isMine ? 'text-sahara-200' : 'text-gray-400'}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                  <TickMark msg={msg} currentUserId={user._id} />
                </div>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ended banner */}
      {ended && (
        <div className="bg-red-50 border-t border-red-100 px-4 py-3 text-center text-sm text-red-500">
          This session has ended
        </div>
      )}

      {/* Input */}
      {!ended && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <textarea value={text} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sahara-300 resize-none" />
          <button onClick={sendMessage}
            className="bg-sahara-500 hover:bg-sahara-600 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium">
            Send
          </button>
        </div>
      )}
    </div>
  );
}
