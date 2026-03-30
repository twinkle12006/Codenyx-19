const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, age: user.age },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const publicUser = (u) => ({
  name: u.name, email: u.email, role: u.role, age: u.age,
  specialties: u.specialties, bio: u.bio,
  status: u.status, sessions: u.sessions, rating: u.rating,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, age: age || 0, role: role || 'user' });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Incorrect email or password' });
    if (user.isActive === false)
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the admin.' });

    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
