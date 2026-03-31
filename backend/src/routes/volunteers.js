const router = require('express').Router();
const User = require('../models/User');
const VolunteerRating = require('../models/VolunteerRating');
const { auth, volunteerOnly } = require('../middleware/auth');

// List all volunteers with avg rating
router.get('/', auth, async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer' }).select('-password -email');
    const result = await Promise.all(volunteers.map(async (v) => {
      const ratings = await VolunteerRating.find({ volunteerId: v._id });
      const avg = ratings.length
        ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
        : null;
      return {
        _id: v._id,
        anonymousUsername: v.anonymousUsername,
        specialties: v.specialties,
        languages: v.languages,
        bio: v.bio,
        isBusy: v.isBusy,
        isAvailable: v.isAvailable,
        avgRating: avg,
        ratingCount: ratings.length
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit rating
router.post('/:id/ratings', auth, async (req, res) => {
  try {
    const { sessionId, rating, review } = req.body;
    const existing = await VolunteerRating.findOne({ sessionId });
    if (existing) return res.status(400).json({ message: 'Already rated this session' });
    const r = await VolunteerRating.create({
      volunteerId: req.params.id,
      userId: req.user._id,
      sessionId,
      rating,
      review: review || ''
    });
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ratings for a volunteer
router.get('/:id/ratings', auth, async (req, res) => {
  try {
    const ratings = await VolunteerRating.find({ volunteerId: req.params.id })
      .populate('userId', 'anonymousUsername');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update volunteer profile
router.put('/profile', auth, volunteerOnly, async (req, res) => {
  try {
    const { bio, specialties, languages } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bio, specialties, languages },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
