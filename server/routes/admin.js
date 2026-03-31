const router = require('express').Router();
const User = require('../models/User');
const Vent = require('../models/Vent');
const MoodLog = require('../models/MoodLog');
const ChatSession = require('../models/ChatSession');
const ModerationLog = require('../models/ModerationLog');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const bcrypt = require('bcryptjs');

const guard = [authMiddleware, adminMiddleware];

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────
router.get('/stats', guard, async (req, res) => {
  try {
    const now = new Date();
    const day7  = new Date(now - 7  * 86400000);
    const day30 = new Date(now - 30 * 86400000);

    const [
      totalUsers, totalMentors, totalVents, totalSessions,
      recentVents, moodLogs, sessions30, newUsers7,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'mentor' }),
      Vent.countDocuments(),
      ChatSession.countDocuments(),
      Vent.find({ distress: { $gt: 0.7 } }).sort({ createdAt: -1 }).limit(5),
      MoodLog.find({ createdAt: { $gte: day30 } }),
      ChatSession.find({ createdAt: { $gte: day30 } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: day7 } }),
    ]);

    // Mood distribution (last 30 days)
    const moodDist = { 'Very Low': 0, 'Low': 0, 'Okay': 0, 'Good': 0, 'Great': 0 };
    moodLogs.forEach(m => { if (moodDist[m.label] !== undefined) moodDist[m.label]++; });
    const moodDistribution = Object.entries(moodDist).map(([label, count]) => ({ label, count }));

    // Daily check-ins for last 14 days
    const dailyCheckins = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = moodLogs.filter(m => new Date(m.createdAt).toDateString() === d.toDateString()).length;
      dailyCheckins.push({ date: dateStr, checkins: count });
    }

    // Sessions per day last 14 days
    const dailySessions = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = sessions30.filter(s => new Date(s.createdAt).toDateString() === d.toDateString()).length;
      dailySessions.push({ date: dateStr, sessions: count });
    }

    // Mood by slot
    const slotDist = { morning: 0, afternoon: 0, evening: 0 };
    moodLogs.forEach(m => { if (slotDist[m.slot] !== undefined) slotDist[m.slot]++; });
    const slotDistribution = Object.entries(slotDist).map(([slot, count]) => ({ slot, count }));

    // Vent mood breakdown
    const allVents = await Vent.find({}, 'mood distress');
    const ventMoods = {};
    allVents.forEach(v => { ventMoods[v.mood] = (ventMoods[v.mood] || 0) + 1; });
    const ventMoodDist = Object.entries(ventMoods).map(([mood, count]) => ({ mood, count }));

    // Escalation rate
    const escalated = sessions30.filter(s => s.escalated).length;
    const avgDuration = sessions30.length
      ? Math.round(sessions30.reduce((a, s) => a + (s.duration || 0), 0) / sessions30.length)
      : 0;

    res.json({
      totalUsers, totalMentors, totalVents, totalSessions,
      newUsers7, escalated, avgDuration,
      highDistressVents: recentVents,
      moodDistribution, dailyCheckins, dailySessions,
      slotDistribution, ventMoodDist,
      totalCheckins: moodLogs.length,
      sessions30: sessions30.length,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── MENTOR MANAGEMENT ────────────────────────────────────────────────────────

// GET all mentors
router.get('/mentors', guard, async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }).select('-password').sort({ createdAt: -1 });
    res.json(mentors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create mentor (admin only)
router.post('/mentors', guard, async (req, res) => {
  try {
    const { name, username, email, password, age, specialties, bio } = req.body;
    if (!name || !username || !email || !password) return res.status(400).json({ message: 'Name, username, email and password are required' });

    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase()))
      return res.status(400).json({ message: 'Username must be 3–20 characters, letters/numbers/underscore only' });

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) return res.status(409).json({ message: 'Username already taken' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const mentor = await User.create({
      name, username: username.toLowerCase(), email, password, age: age || 25, role: 'mentor',
      specialties: specialties || [], bio: bio || '',
      status: 'available', sessions: 0, rating: 5.0,
    });
    const m = mentor.toObject(); delete m.password;
    res.status(201).json(m);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH update mentor (specialties, bio, status, isActive)
router.patch('/mentors/:id', guard, async (req, res) => {
  try {
    const allowed = ['name', 'specialties', 'bio', 'status', 'isActive', 'rating'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const mentor = await User.findOneAndUpdate({ _id: req.params.id, role: 'mentor' }, update, { new: true }).select('-password');
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    res.json(mentor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE mentor
router.delete('/mentors/:id', guard, async (req, res) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id, role: 'mentor' });
    res.json({ message: 'Mentor removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── USER MANAGEMENT ──────────────────────────────────────────────────────────

// GET all users
router.get('/users', guard, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 }).limit(100);
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH toggle user active status
router.patch('/users/:id', guard, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'user' }, { isActive: req.body.isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── VENTS (admin view) ───────────────────────────────────────────────────────
router.get('/vents', guard, async (req, res) => {
  try {
    const vents = await Vent.find().sort({ createdAt: -1 }).limit(100);
    res.json(vents.map(v => {
      const obj = v.toObject();
      obj.reactions = Object.fromEntries(v.reactions || []);
      return obj;
    }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE vent (admin moderation)
router.delete('/vents/:id', guard, async (req, res) => {
  try {
    await Vent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vent removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

// ── MODERATION LOGS ──────────────────────────────────────────────────────────
router.get('/moderation', guard, async (req, res) => {
  try {
    const logs = await ModerationLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DOCTOR MANAGEMENT ────────────────────────────────────────────────────────

router.get('/doctors', guard, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password').sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/doctors', guard, async (req, res) => {
  try {
    const { name, username, email, password, age, specialties, bio, experience, qualification, zoomLink } = req.body;
    if (!name || !username || !email || !password) return res.status(400).json({ message: 'Name, username, email and password are required' });
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) return res.status(400).json({ message: 'Invalid username format' });
    if (await User.findOne({ username: username.toLowerCase() })) return res.status(409).json({ message: 'Username already taken' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });
    const doctor = await User.create({
      name, username: username.toLowerCase(), email, password,
      age: age || 30, role: 'doctor',
      specialties: specialties || [], bio: bio || '',
      experience: experience || 0, qualification: qualification || '',
      zoomLink: zoomLink || '',
      status: 'available', casesResolved: 0, activeCases: 0, rating: 5.0,
    });
    const d = doctor.toObject(); delete d.password;
    res.status(201).json(d);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/doctors/:id', guard, async (req, res) => {
  try {
    const allowed = ['name', 'specialties', 'bio', 'status', 'isActive', 'experience', 'qualification', 'zoomLink', 'casesResolved', 'activeCases'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const doctor = await User.findOneAndUpdate({ _id: req.params.id, role: 'doctor' }, update, { new: true }).select('-password');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/doctors/:id', guard, async (req, res) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id, role: 'doctor' });
    res.json({ message: 'Doctor removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
