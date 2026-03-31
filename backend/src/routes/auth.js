const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { generateAnonymousUsername } = require('../utils/usernameGenerator');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    let username;
    let attempts = 0;
    do {
      username = generateAnonymousUsername();
      attempts++;
    } while (await User.findOne({ anonymousUsername: username }) && attempts < 20);

    const user = await User.create({ name, email, password, role: role || 'user', anonymousUsername: username });
    const token = signToken(user._id);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', auth, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

// Regenerate anonymous username (once per 7 days)
router.post('/regenerate-username', auth, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    if (user.anonymousUsernameLastChanged) {
      const diff = now - new Date(user.anonymousUsernameLastChanged);
      const days = diff / (1000 * 60 * 60 * 24);
      if (days < 7) {
        const remaining = Math.ceil(7 - days);
        return res.status(400).json({ message: `You can regenerate in ${remaining} day(s)` });
      }
    }
    let username;
    let attempts = 0;
    do {
      username = generateAnonymousUsername();
      attempts++;
    } while (await User.findOne({ anonymousUsername: username }) && attempts < 20);

    user.anonymousUsername = username;
    user.anonymousUsernameLastChanged = now;
    await user.save();
    res.json({ anonymousUsername: username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function sanitize(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    anonymousUsername: user.anonymousUsername,
    anonymousUsernameLastChanged: user.anonymousUsernameLastChanged,
    isBusy: user.isBusy,
    specialties: user.specialties,
    languages: user.languages,
    bio: user.bio,
    isAvailable: user.isAvailable
  };
}

module.exports = router;
