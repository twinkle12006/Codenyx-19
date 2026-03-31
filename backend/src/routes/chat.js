const router = require('express').Router();
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const { auth, volunteerOnly } = require('../middleware/auth');

// User requests a new chat session with a volunteer
router.post('/request', auth, async (req, res) => {
  try {
    const { volunteerId } = req.body;
    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    if (volunteer.isBusy) {
      return res.status(400).json({ message: 'Volunteer is currently busy' });
    }
    const session = await ChatSession.create({ userId: req.user._id, volunteerId });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's active session
router.get('/user/active', auth, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      userId: req.user._id,
      ended: false
    }).populate('volunteerId', 'anonymousUsername isBusy');
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get volunteer's active sessions
router.get('/mentor/active', auth, volunteerOnly, async (req, res) => {
  try {
    const sessions = await ChatSession.find({
      volunteerId: req.user._id,
      ended: false
    }).populate('userId', 'anonymousUsername');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get session by ID
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId)
      .populate('userId', 'anonymousUsername')
      .populate('volunteerId', 'anonymousUsername isBusy');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const uid = req.user._id.toString();
    if (session.userId._id.toString() !== uid && session.volunteerId._id.toString() !== uid) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark messages as read
router.post('/:sessionId/read', auth, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Not found' });
    const now = new Date();
    session.messages.forEach(msg => {
      if (msg.senderId.toString() !== req.user._id.toString() && !msg.readAt) {
        msg.readAt = now;
      }
    });
    await session.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
