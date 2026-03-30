const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  age:           { type: Number, default: 0 },
  role:          { type: String, enum: ['user', 'mentor', 'admin'], default: 'user' },
  // mentor-specific fields
  specialties:   [String],
  bio:           { type: String, default: '' },
  status:        { type: String, enum: ['available', 'away', 'busy'], default: 'available' },
  sessions:      { type: Number, default: 0 },
  rating:        { type: Number, default: 5.0 },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
