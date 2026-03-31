require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const ChatMessage = require('./models/ChatMessage');
const ChatSession = require('./models/ChatSession');
const User        = require('./models/User');

const app    = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:3000']
  : ['http://localhost:3000'];

const io     = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── REST routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/vents',      require('./routes/vents'));
app.use('/api/mood',       require('./routes/mood'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/clinics',    require('./routes/clinics'));
app.use('/api/stats',      require('./routes/stats'));
app.use('/api/healthcard', require('./routes/healthcard'));
app.use('/api/journal',    require('./routes/journal'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/mentor',     require('./routes/mentor'));
app.use('/api/doctor',     require('./routes/doctor'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/reviews',    require('./routes/reviews'));

// ── Socket.io ────────────────────────────────────────────────────────────────
// Authenticate socket connections via JWT — anonymous (no token) allowed for SOS
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Anonymous emergency user
    socket.user = { id: `anon_${Date.now()}`, name: 'Anonymous', role: 'guest' };
    return next();
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, name, role } = socket.user;

  // Join a chat room (sessionId = userId__mentorId)
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    socket.currentSession = sessionId;
  });

  // Leave session
  socket.on('leave_session', (sessionId) => {
    socket.leave(sessionId);
  });

  // Send message — save to DB then broadcast to room
  socket.on('send_message', async ({ sessionId, text, from, fromName }) => {
    if (!text?.trim() || !sessionId) return;
    try {
      const msg = await ChatMessage.create({
        sessionId, from, fromName, text: text.trim(),
      });
      // Broadcast to everyone in the room (including sender for confirmation)
      io.to(sessionId).emit('new_message', {
        _id:       msg._id,
        sessionId: msg.sessionId,
        from:      msg.from,
        fromName:  msg.fromName,
        text:      msg.text,
        createdAt: msg.createdAt,
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Typing indicator
  socket.on('typing', ({ sessionId, isTyping }) => {
    socket.to(sessionId).emit('typing', { name, isTyping });
  });

  // End session
  socket.on('end_session', async ({ sessionId, mentorName, escalated, duration }) => {
    try {
      const messages = await ChatMessage.find({
        sessionId,
        text: { $ne: '__SESSION_ENDED__' },
      }).sort({ createdAt: 1 });

      if (messages.length > 0) {
        const parts   = sessionId.split('__');
        const ownerId = parts[0];
        await ChatSession.create({
          userId:        ownerId,
          volunteerName: mentorName || name,
          messages:      messages.map(m => ({ from: m.from, text: m.text })),
          escalated:     escalated || false,
          duration:      duration  || 0,
        });
        if (mentorName) {
          await User.findOneAndUpdate(
            { name: mentorName, role: 'mentor' },
            { $inc: { sessions: 1 } }
          );
        }
      }

      // Notify everyone in the room
      io.to(sessionId).emit('session_ended', { endedBy: name });

      // Clean up messages immediately
      await ChatMessage.deleteMany({ sessionId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {});
});

// Expose io for use in routes if needed
app.set('io', io);

// ── DB + Start ───────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('MongoDB connected');
  server.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT || 5000}`)
  );
}).catch(err => console.error('DB error:', err));
