const router = require('express').Router();
const Vent = require('../models/Vent');
const { auth } = require('../middleware/auth');

// Get all vents
router.get('/', auth, async (req, res) => {
  try {
    const vents = await Vent.find().sort({ createdAt: -1 });
    res.json(vents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create vent
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const vent = await Vent.create({
      userId: req.user._id,
      anonymousUsername: req.user.anonymousUsername,
      title, content, tags: tags || []
    });
    res.status(201).json(vent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle like on vent
router.post('/:id/like', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    const uid = req.user._id.toString();
    vent.dislikes = vent.dislikes.filter(id => id.toString() !== uid);
    const idx = vent.likes.findIndex(id => id.toString() === uid);
    if (idx > -1) vent.likes.splice(idx, 1);
    else vent.likes.push(req.user._id);
    await vent.save();
    res.json({ likes: vent.likes.length, dislikes: vent.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle dislike on vent
router.post('/:id/dislike', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    const uid = req.user._id.toString();
    vent.likes = vent.likes.filter(id => id.toString() !== uid);
    const idx = vent.dislikes.findIndex(id => id.toString() === uid);
    if (idx > -1) vent.dislikes.splice(idx, 1);
    else vent.dislikes.push(req.user._id);
    await vent.save();
    res.json({ likes: vent.likes.length, dislikes: vent.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    vent.comments.push({
      userId: req.user._id,
      anonymousUsername: req.user.anonymousUsername,
      text: req.body.text
    });
    await vent.save();
    res.status(201).json(vent.comments[vent.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like/dislike comment
router.post('/:id/comments/:commentId/like', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const uid = req.user._id.toString();
    comment.dislikes = comment.dislikes.filter(id => id.toString() !== uid);
    const idx = comment.likes.findIndex(id => id.toString() === uid);
    if (idx > -1) comment.likes.splice(idx, 1);
    else comment.likes.push(req.user._id);
    await vent.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/comments/:commentId/dislike', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const uid = req.user._id.toString();
    comment.likes = comment.likes.filter(id => id.toString() !== uid);
    const idx = comment.dislikes.findIndex(id => id.toString() === uid);
    if (idx > -1) comment.dislikes.splice(idx, 1);
    else comment.dislikes.push(req.user._id);
    await vent.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reply to comment
router.post('/:id/comments/:commentId/reply', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    comment.replies.push({
      userId: req.user._id,
      anonymousUsername: req.user.anonymousUsername,
      text: req.body.text
    });
    await vent.save();
    res.status(201).json(comment.replies[comment.replies.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like/dislike reply
router.post('/:id/comments/:commentId/replies/:replyId/like', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    const comment = vent.comments.id(req.params.commentId);
    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });
    const uid = req.user._id.toString();
    reply.dislikes = reply.dislikes.filter(id => id.toString() !== uid);
    const idx = reply.likes.findIndex(id => id.toString() === uid);
    if (idx > -1) reply.likes.splice(idx, 1);
    else reply.likes.push(req.user._id);
    await vent.save();
    res.json({ likes: reply.likes.length, dislikes: reply.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/comments/:commentId/replies/:replyId/dislike', auth, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    const comment = vent.comments.id(req.params.commentId);
    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });
    const uid = req.user._id.toString();
    reply.likes = reply.likes.filter(id => id.toString() !== uid);
    const idx = reply.dislikes.findIndex(id => id.toString() === uid);
    if (idx > -1) reply.dislikes.splice(idx, 1);
    else reply.dislikes.push(req.user._id);
    await vent.save();
    res.json({ likes: reply.likes.length, dislikes: reply.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
