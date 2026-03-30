const router = require('express').Router();
const Vent   = require('../models/Vent');
const User   = require('../models/User');
const authMiddleware = require('../middleware/auth');

function serialize(vent) {
  const obj = vent.toObject({ virtuals: false });
  return obj;
}

// GET all vents sorted by likes desc (global ranking)
router.get('/', async (req, res) => {
  try {
    const vents = await Vent.find()
      .sort({ likes: -1, createdAt: -1 })
      .limit(100);
    res.json(vents.map(serialize));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create vent
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { anon, color, mood, text, distress } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text is required' });
    const vent = await Vent.create({
      anon, color, mood, text: text.trim(), distress: distress || 0,
    });
    res.status(201).json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST like a vent (toggle)
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vent   = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });

    const liked    = vent.likedBy.includes(userId);
    const disliked = vent.dislikedBy.includes(userId);

    if (liked) {
      // un-like
      vent.likes = Math.max(0, vent.likes - 1);
      vent.likedBy = vent.likedBy.filter(id => id !== userId);
    } else {
      // like — remove dislike if present
      if (disliked) {
        vent.dislikes = Math.max(0, vent.dislikes - 1);
        vent.dislikedBy = vent.dislikedBy.filter(id => id !== userId);
      }
      vent.likes += 1;
      vent.likedBy.push(userId);
    }
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST dislike a vent (toggle)
router.post('/:id/dislike', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vent   = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });

    const liked    = vent.likedBy.includes(userId);
    const disliked = vent.dislikedBy.includes(userId);

    if (disliked) {
      vent.dislikes = Math.max(0, vent.dislikes - 1);
      vent.dislikedBy = vent.dislikedBy.filter(id => id !== userId);
    } else {
      if (liked) {
        vent.likes = Math.max(0, vent.likes - 1);
        vent.likedBy = vent.likedBy.filter(id => id !== userId);
      }
      vent.dislikes += 1;
      vent.dislikedBy.push(userId);
    }
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST add comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

    const user   = await User.findById(req.user.id).select('name role');
    const vent   = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });

    const isMentor = user.role === 'mentor';
    vent.comments.push({
      userId:   req.user.id,
      userName: user.name,
      isMentor,
      text:     text.trim(),
    });
    if (isMentor) vent.mentorReplies += 1;
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST like a comment (toggle)
router.post('/:id/comment/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vent   = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const liked    = comment.likedBy.includes(userId);
    const disliked = comment.dislikedBy.includes(userId);
    if (liked) {
      comment.likes = Math.max(0, comment.likes - 1);
      comment.likedBy = comment.likedBy.filter(id => id !== userId);
    } else {
      if (disliked) {
        comment.dislikes = Math.max(0, comment.dislikes - 1);
        comment.dislikedBy = comment.dislikedBy.filter(id => id !== userId);
      }
      comment.likes += 1;
      comment.likedBy.push(userId);
    }
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST dislike a comment (toggle)
router.post('/:id/comment/:commentId/dislike', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vent   = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const liked    = comment.likedBy.includes(userId);
    const disliked = comment.dislikedBy.includes(userId);
    if (disliked) {
      comment.dislikes = Math.max(0, comment.dislikes - 1);
      comment.dislikedBy = comment.dislikedBy.filter(id => id !== userId);
    } else {
      if (liked) {
        comment.likes = Math.max(0, comment.likes - 1);
        comment.likedBy = comment.likedBy.filter(id => id !== userId);
      }
      comment.dislikes += 1;
      comment.dislikedBy.push(userId);
    }
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE comment
router.delete('/:id/comment/:commentId', authMiddleware, async (req, res) => {
  try {
    const vent = await Vent.findById(req.params.id);
    if (!vent) return res.status(404).json({ message: 'Not found' });
    const comment = vent.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not allowed' });
    if (comment.isMentor) vent.mentorReplies = Math.max(0, vent.mentorReplies - 1);
    comment.deleteOne();
    await vent.save();
    res.json(serialize(vent));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
