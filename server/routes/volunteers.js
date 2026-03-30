const router = require('express').Router();
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const authMiddleware = require('../middleware/auth');

const COLORS = ['#6366f1','#8b5cf6','#14b8a6','#f59e0b','#f43f5e','#22c55e'];

// GET all active mentors — returns fields HelpSection needs
router.get('/', async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor', isActive: true })
      .select('-password')
      .sort({ sessions: -1 });

    // Attach color + initials derived fields
    const result = mentors.map((m, i) => ({
      _id:          m._id,
      name:         m.name,
      initials:     m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color:        COLORS[i % COLORS.length],
      status:       m.status || 'available',
      specialties:  m.specialties || [],
      sessions:     m.sessions || 0,
      rating:       m.rating || 5.0,
      responseTime: m.sessions > 100 ? '< 1 min' : m.sessions > 50 ? '~2 min' : '~3 min',
      bio:          m.bio || "I'm here to listen and support you.",
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST save chat session + increment mentor session count
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { volunteerName, messages, escalated, duration } = req.body;
    const session = await ChatSession.create({ userId: req.user.id, volunteerName, messages, escalated, duration });
    await User.findOneAndUpdate({ name: volunteerName, role: 'mentor' }, { $inc: { sessions: 1 } });
    res.status(201).json(session);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
