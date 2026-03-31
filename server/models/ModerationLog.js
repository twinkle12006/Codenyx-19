const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:  { type: String },
  ventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vent' },
  text:      { type: String },           // the flagged comment text
  score:     { type: Number },           // toxicity score 0-1
  reason:    { type: String },           // severe_abuse | high_toxicity | spam
  action:    { type: String, default: 'comment_removed_user_suspended' },
}, { timestamps: true });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
