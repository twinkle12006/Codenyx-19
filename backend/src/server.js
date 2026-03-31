require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const ChatSession = require('./models/ChatSession');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vents', require('./routes/vents'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/resources', require('./routes/resources'));

// Socket.IO auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Auth failed'));
  }
});

// Track socket IDs per user
const userSockets = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  userSockets.set(userId, socket.id);

  // Join a chat session room
  socket.on('join_session', async ({ sessionId }) => {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session) return;
      const uid = socket.user._id.toString();
      if (session.userId.toString() !== uid && session.volunteerId.toString() !== uid) return;
      socket.join(`session:${sessionId}`);
    } catch {}
  });

  // Send message
  socket.on('send_message', async ({ sessionId, text }) => {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session || session.ended) return;
      const uid = socket.user._id.toString();
      if (session.userId.toString() !== uid && session.volunteerId.toString() !== uid) return;

      const msg = { senderId: socket.user._id, text, createdAt: new Date() };
      session.messages.push(msg);
      await session.save();
      const saved = session.messages[session.messages.length - 1];

      // Emit to room
      io.to(`session:${sessionId}`).emit('new_message', { sessionId, message: saved });

      // Delivered receipt to sender
      socket.emit('message_delivered', { sessionId, messageId: saved._id });
    } catch {}
  });

  // Typing indicator
  socket.on('typing', ({ sessionId }) => {
    socket.to(`session:${sessionId}`).emit('user_typing', {
      sessionId,
      username: socket.user.anonymousUsername
    });
  });

  socket.on('stop_typing', ({ sessionId }) => {
    socket.to(`session:${sessionId}`).emit('user_stop_typing', { sessionId });
  });

  // Mark messages read
  socket.on('mark_read', async ({ sessionId }) => {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session) return;
      const now = new Date();
      let changed = false;
      session.messages.forEach(msg => {
        if (msg.senderId.toString() !== socket.user._id.toString() && !msg.readAt) {
          msg.readAt = now;
          changed = true;
        }
      });
      if (changed) {
        await session.save();
        io.to(`session:${sessionId}`).emit('messages_read', { sessionId, readAt: now });
      }
    } catch {}
  });

  // End session
  socket.on('end_session', async ({ sessionId }) => {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session || session.ended) return;
      const uid = socket.user._id.toString();
      if (session.userId.toString() !== uid && session.volunteerId.toString() !== uid) return;

      session.ended = true;
      session.endedAt = new Date();
      await session.save();

      // Free up volunteer
      await User.findByIdAndUpdate(session.volunteerId, { isBusy: false });

      // Notify both parties
      io.to(`session:${sessionId}`).emit('session_ended', { sessionId });

      // Broadcast volunteer status change
      io.emit('volunteer_status_change', {
        volunteerId: session.volunteerId.toString(),
        isBusy: false
      });
    } catch {}
  });

  // Volunteer sets busy status when joining session
  socket.on('set_busy', async ({ isBusy }) => {
    try {
      await User.findByIdAndUpdate(socket.user._id, { isBusy });
      io.emit('volunteer_status_change', {
        volunteerId: socket.user._id.toString(),
        isBusy
      });
    } catch {}
  });

  socket.on('disconnect', () => {
    userSockets.delete(userId);
  });
});

// DB + start
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sahara')
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Sahara backend running on port ${PORT}`));
  })
  .catch(err => console.error('DB connection error:', err));
