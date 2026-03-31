const router = require('express').Router();
const Resource = require('../models/Resource');
const { auth, volunteerOnly } = require('../middleware/auth');

// Get all resources (optionally filter by tag)
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.tag) filter.tags = req.query.tag;
    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload resource (volunteer only)
router.post('/', auth, volunteerOnly, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, tags } = req.body;
    const resource = await Resource.create({
      uploadedBy: req.user._id,
      uploaderUsername: req.user.anonymousUsername,
      title,
      description,
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      tags: tags || []
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Not found' });
    const uid = req.user._id.toString();
    const idx = resource.likes.findIndex(id => id.toString() === uid);
    if (idx > -1) resource.likes.splice(idx, 1);
    else resource.likes.push(req.user._id);
    await resource.save();
    res.json({ likes: resource.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
