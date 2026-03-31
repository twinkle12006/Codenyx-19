const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  username:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  age:           { type: Number, default: 0 },
  role:          { type: String, enum: ['user', 'mentor', 'admin', 'doctor'], default: 'user' },
  // mentor-specific fields
  specialties:   [String],
  bio:           { type: String, default: '' },
  status:        { type: String, enum: ['available', 'away', 'busy'], default: 'available' },
  sessions:      { type: Number, default: 0 },
  rating:        { type: Number, default: 5.0 },
  isActive:      { type: Boolean, default: true },
  // doctor-specific fields
  experience:    { type: Number, default: 0 },        // years
  qualification: { type: String, default: '' },       // e.g. "MBBS, MD Psychiatry"
  casesResolved: { type: Number, default: 0 },
  activeCases:   { type: Number, default: 0 },
  zoomLink:      { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
