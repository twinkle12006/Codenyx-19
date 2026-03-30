// Run once: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Clinic = require('./models/Clinic');
const Vent = require('./models/Vent');

const clinics = [
  { name: 'Sunrise Wellness Center', status: 'open', slots: 2, distance: '0.8 km', wait: 'Now', address: 'Andheri West, Mumbai', x: 25, y: 20 },
  { name: 'Serenity Mental Health',  status: 'open', slots: 1, distance: '1.4 km', wait: '~10 min', address: 'Bandra, Mumbai', x: 55, y: 35 },
  { name: 'Hope Foundation Clinic',  status: 'wait', slots: 0, distance: '2.1 km', wait: '~30 min', address: 'Juhu, Mumbai', x: 40, y: 60 },
  { name: 'Mind & Soul Center',      status: 'open', slots: 3, distance: '2.8 km', wait: 'Now', address: 'Malad, Mumbai', x: 75, y: 25 },
  { name: 'Calm Harbor Therapy',     status: 'full', slots: 0, distance: '3.5 km', wait: '> 1 hr', address: 'Goregaon, Mumbai', x: 65, y: 70 },
  { name: 'Harmony Health Hub',      status: 'wait', slots: 0, distance: '4.2 km', wait: '~45 min', address: 'Borivali, Mumbai', x: 85, y: 55 },
];

const seedVents = [
  { anon: 'Anonymous Starholder', color: '#6366f1', mood: 'overwhelmed', text: "I have three exams next week and I haven't slept properly in 5 days. Every time I try to study my brain just goes blank and I end up crying.", distress: 0.82 },
  { anon: 'Wandering Cloud',      color: '#8b5cf6', mood: 'anxious',     text: "Job interview tomorrow and my heart won't stop racing. I've prepared so much but what if I blank out? My whole family is counting on this.", distress: 0.55 },
  { anon: 'Silent River',         color: '#14b8a6', mood: 'hopeful',     text: "Update: three weeks after joining one of the volunteer chats here, I talked to a therapist. I'm doing so much better. This place genuinely helped. Thank you 💜", distress: 0.05 },
  { anon: 'Midnight Oak',         color: '#f59e0b', mood: 'sad',         text: "My best friend stopped talking to me out of nowhere. I replay every conversation wondering what I did wrong. The silence is the worst part.", distress: 0.6 },
  { anon: 'Quiet Storm',          color: '#f43f5e', mood: 'angry',       text: "Why does everyone expect me to be okay? I am not okay. I haven't been okay in months and nobody seems to actually notice or care.", distress: 0.75 },
  { anon: 'Golden Moth',          color: '#22c55e', mood: 'hopeful',     text: "Started journaling every morning this week. Small thing, but it's helping me notice when anxiety starts creeping in. Sharing in case it helps someone else too.", distress: 0.08 },
];

const mentors = [
  { name: 'Priya M.',  email: 'priya@mindbridge.ngo',  password: 'mentor123', age: 28, role: 'mentor', specialties: ['Anxiety', 'Academic Stress', 'Loneliness'], bio: "I'm here to listen, not judge.", status: 'available', sessions: 142, rating: 4.9 },
  { name: 'Arjun K.',  email: 'arjun@mindbridge.ngo',  password: 'mentor123', age: 32, role: 'mentor', specialties: ['Depression', 'Family Issues', 'Career'],     bio: 'Trained in emotional first aid.', status: 'available', sessions: 89, rating: 4.8 },
  { name: 'Sneha R.',  email: 'sneha@mindbridge.ngo',  password: 'mentor123', age: 26, role: 'mentor', specialties: ['Relationships', 'Self-esteem', 'Grief'],      bio: 'Your feelings are valid.', status: 'available', sessions: 201, rating: 5.0 },
  { name: 'Rahul D.',  email: 'rahul@mindbridge.ngo',  password: 'mentor123', age: 35, role: 'mentor', specialties: ['Panic Attacks', 'Trauma', 'Identity'],        bio: "Here when you're ready to talk.", status: 'away', sessions: 67, rating: 4.7 },
  { name: 'Meera T.',  email: 'meera@mindbridge.ngo',  password: 'mentor123', age: 29, role: 'mentor', specialties: ['Body Image', 'Social Anxiety', 'Burnout'],    bio: 'Small steps are still steps forward.', status: 'available', sessions: 178, rating: 4.9 },
  { name: 'Vikram P.', email: 'vikram@mindbridge.ngo', password: 'mentor123', age: 31, role: 'mentor', specialties: ['Study Stress', 'Peer Pressure', 'Motivation'], bio: 'You reached out — that took courage.', status: 'available', sessions: 54, rating: 4.6 },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected. Seeding...');

  // Admin
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    await User.create({ name: 'Admin', email: 'admin@mindbridge.ngo', password: 'admin123', age: 30, role: 'admin' });
    console.log('Admin created: admin@mindbridge.ngo / admin123');
  } else {
    console.log('Admin already exists');
  }

  // Mentors — delete old ones and re-seed
  await User.deleteMany({ role: 'mentor' });
  for (const m of mentors) {
    await User.create(m);
  }
  console.log('Mentors seeded (login: mentor123)');

  // Clinics
  await Clinic.deleteMany({});
  await Clinic.insertMany(clinics);

  // Vents
  await Vent.deleteMany({});
  await Vent.insertMany(seedVents);

  console.log('Clinics and vents seeded');
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
