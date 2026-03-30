const router  = require('express').Router();
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const User        = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET messages for a session (poll every few seconds)
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { since } = req.query; // ISO timestamp — only return newer messages
    const query = { sessionId: req.params.sessionId };
    if (since) query.createdAt = { $gt: new Date(since) };
    const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST send a message
router.post('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { text, from, fromName } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text required' });
    const msg = await ChatMessage.create({
      sessionId: req.params.sessionId,
      from, fromName,
      text: text.trim(),
    });
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST end session — saves to ChatSession history
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const { mentorName, escalated, duration } = req.body;
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ createdAt: 1 });
    if (messages.length > 0) {
      await ChatSession.create({
        userId: req.user.id,
        volunteerName: mentorName,
        messages: messages.map(m => ({ from: m.from, text: m.text })),
        escalated: escalated || false,
        duration: duration || 0,
      });
      await User.findOneAndUpdate({ name: mentorName, role: 'mentor' }, { $inc: { sessions: 1 } });
    }
    // Clean up live messages
    await ChatMessage.deleteMany({ sessionId: req.params.sessionId });
    res.json({ message: 'Session ended' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET active sessions for a mentor (sessions that have messages in last 30 min)
router.get('/mentor/active', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'mentor') return res.status(403).json({ message: 'Mentor only' });
    const since = new Date(Date.now() - 30 * 60 * 1000);
    // Find all sessionIds that contain this mentor's ID and have recent messages
    const recent = await ChatMessage.find({
      sessionId: { $regex: req.user.id },
      createdAt: { $gt: since },
    }).distinct('sessionId');
    res.json(recent);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
