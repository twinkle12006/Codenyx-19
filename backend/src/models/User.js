const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'volunteer'], default: 'user' },
  anonymousUsername: { type: String, unique: true },
  anonymousUsernameLastChanged: { type: Date, default: null },

  // Volunteer-specific
  isBusy: { type: Boolean, default: false },
  specialties: [String],
  languages: [String],
  bio: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
