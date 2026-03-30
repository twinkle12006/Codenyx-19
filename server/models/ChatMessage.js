const mongoose = require('mongoose');

// Live chat messages for an active session
const chatMessageSchema = new mongoose.Schema({
  sessionId:  { type: String, required: true, index: true }, // userId + mentorId
  from:       { type: String, enum: ['user', 'mentor'], required: true },
  fromName:   { type: String, required: true },
  text:       { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
