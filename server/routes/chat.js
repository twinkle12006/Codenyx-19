const router      = require('express').Router();
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const User        = require('../models/User');
const authMiddleware = require('../middleware/auth');

// STATIC routes MUST come before /:sessionId

// GET active sessions for a mentor
// Session IDs are formatted as: userId__mentorId
router.get('/mentor/active', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'mentor') return res.status(403).json({ message: 'Mentor only' });
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const mentorId = req.user.id.toString();
    const recent = await ChatMessage.find({
      sessionId: { $regex: `__${mentorId}$` },
      createdAt: { $gt: since },
    }).distinct('sessionId');
    res.json(recent);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET messages for a session
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { since } = req.query;
    const query = { sessionId: req.params.sessionId };
    if (since) query.createdAt = { $gt: new Date(since) };
    const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).limit(200);
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

// POST end session — saves to history and cleans up live messages
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const { mentorName, escalated, duration } = req.body;
    const messages = await ChatMessage.find({
      sessionId: req.params.sessionId,
      text: { $ne: '__SESSION_ENDED__' }
    }).sort({ createdAt: 1 });

    if (messages.length > 0) {
      // Find the user ID from the session ID (format: userId__mentorId)
      const userId = req.params.sessionId.split('__')[0];
      await ChatSession.create({
        userId: userId || req.user.id,
        volunteerName: mentorName || req.user.name,
        messages: messages.map(m => ({ from: m.from, text: m.text })),
        escalated: escalated || false,
        duration: duration || 0,
      });
      if (mentorName) {
        await User.findOneAndUpdate({ name: mentorName, role: 'mentor' }, { $inc: { sessions: 1 } });
      }
    }

    // Write system end marker so the other side detects it
    const alreadyEnded = await ChatMessage.findOne({ sessionId: req.params.sessionId, text: '__SESSION_ENDED__' });
    if (!alreadyEnded) {
      await ChatMessage.create({
        sessionId: req.params.sessionId,
        from: 'system', fromName: 'System',
        text: '__SESSION_ENDED__',
      });
    }

    // Clean up after a short delay (give other side time to detect)
    setTimeout(async () => {
      await ChatMessage.deleteMany({ sessionId: req.params.sessionId });
    }, 10000);

    res.json({ message: 'Session ended' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
