const router = require('express').Router();
const User   = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');

const guard = (req, res, next) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctor only' });
  next();
};

// GET own profile
router.get('/me', authMiddleware, guard, async (req, res) => {
  try {
    const doc = await User.findById(req.user.id).select('-password');
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH update own profile
router.patch('/me', authMiddleware, guard, async (req, res) => {
  try {
    const allowed = ['status', 'bio', 'specialties', 'zoomLink', 'qualification', 'experience'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const doc = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET active SOS sessions for this doctor (messages in last 10 min matching __sos pattern)
router.get('/active-sos', authMiddleware, guard, async (req, res) => {
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const sessions = await ChatMessage.find({
      sessionId: { $regex: '__sos' },
      createdAt: { $gt: since },
    }).distinct('sessionId');
    res.json(sessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all available doctors (public — used by SOS section)
router.get('/available', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', status: 'available', isActive: true }).select('-password -email');
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
