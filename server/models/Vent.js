const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId:      { type: String, required: true },
  userName:    { type: String, required: true },
  isMentor:    { type: Boolean, default: false },
  text:        { type: String, required: true },
  likes:       { type: Number, default: 0 },
  dislikes:    { type: Number, default: 0 },
  likedBy:     [String],
  dislikedBy:  [String],
}, { timestamps: true });

const ventSchema = new mongoose.Schema({
  anon:          { type: String, required: true },
  color:         { type: String, required: true },
  mood:          { type: String, required: true },
  text:          { type: String, required: true },
  distress:      { type: Number, default: 0 },
  likes:         { type: Number, default: 0 },
  dislikes:      { type: Number, default: 0 },
  likedBy:       [String],
  dislikedBy:    [String],
  comments:      [commentSchema],
  mentorReplies: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Vent', ventSchema);
