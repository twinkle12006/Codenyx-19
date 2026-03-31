// Run: node seed.js  (from server/ directory)
require('dotenv').config();
const mongoose = require('mongoose');
const User        = require('./models/User');
const Clinic      = require('./models/Clinic');
const Vent        = require('./models/Vent');
const MoodLog     = require('./models/MoodLog');
const ChatSession = require('./models/ChatSession');
const Journal     = require('./models/Journal');

// ─── Helpers ────────────────────────────────────────────────────────────────
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const scoreLabel = (s) => ({ 1:'Very Low', 2:'Low', 3:'Okay', 4:'Good', 5:'Great' }[s]);

// Generate 30 days of mood logs for a user with a given pattern
// pattern: array of 30 scores (index 0 = 30 days ago, index 29 = today)
function makeMoodLogs(userId, pattern, slots = ['morning', 'afternoon', 'evening']) {
  const logs = [];
  pattern.forEach((score, i) => {
    const daysBack = 29 - i;
    const usedSlots = slots.slice(0, score >= 4 ? 3 : score >= 3 ? 2 : 1); // more logs on good days
    usedSlots.forEach(slot => {
      const d = daysAgo(daysBack);
      d.setHours(slot === 'morning' ? 8 : slot === 'afternoon' ? 14 : 20, Math.floor(Math.random() * 59));
      logs.push({ userId, score, label: scoreLabel(score), slot, note: '', createdAt: d, updatedAt: d });
    });
  });
  return logs;
}

// ─── Clinics ─────────────────────────────────────────────────────────────────
const clinics = [
  { name: 'Sunrise Wellness Center', status: 'open', slots: 2, distance: '0.8 km', wait: 'Now',     address: 'Andheri West, Mumbai', x: 25, y: 20 },
  { name: 'Serenity Mental Health',  status: 'open', slots: 1, distance: '1.4 km', wait: '~10 min', address: 'Bandra, Mumbai',       x: 55, y: 35 },
  { name: 'Hope Foundation Clinic',  status: 'wait', slots: 0, distance: '2.1 km', wait: '~30 min', address: 'Juhu, Mumbai',         x: 40, y: 60 },
  { name: 'Mind & Soul Center',      status: 'open', slots: 3, distance: '2.8 km', wait: 'Now',     address: 'Malad, Mumbai',        x: 75, y: 25 },
  { name: 'Calm Harbor Therapy',     status: 'full', slots: 0, distance: '3.5 km', wait: '> 1 hr',  address: 'Goregaon, Mumbai',     x: 65, y: 70 },
  { name: 'Harmony Health Hub',      status: 'wait', slots: 0, distance: '4.2 km', wait: '~45 min', address: 'Borivali, Mumbai',     x: 85, y: 55 },
];

// ─── Vents ────────────────────────────────────────────────────────────────────
const seedVents = [
  { anon: 'Anonymous Starholder', color: '#6366f1', mood: 'overwhelmed', text: "I have three exams next week and I haven't slept properly in 5 days. Every time I try to study my brain just goes blank and I end up crying.", distress: 0.82, likes: 14, dislikes: 0 },
  { anon: 'Wandering Cloud',      color: '#8b5cf6', mood: 'anxious',     text: "Job interview tomorrow and my heart won't stop racing. I've prepared so much but what if I blank out? My whole family is counting on this.", distress: 0.55, likes: 9, dislikes: 1 },
  { anon: 'Silent River',         color: '#14b8a6', mood: 'hopeful',     text: "Update: three weeks after joining one of the volunteer chats here, I talked to a therapist. I'm doing so much better. This place genuinely helped. Thank you 💜", distress: 0.05, likes: 31, dislikes: 0 },
  { anon: 'Midnight Oak',         color: '#f59e0b', mood: 'sad',         text: "My best friend stopped talking to me out of nowhere. I replay every conversation wondering what I did wrong. The silence is the worst part.", distress: 0.6, likes: 22, dislikes: 0 },
  { anon: 'Quiet Storm',          color: '#f43f5e', mood: 'angry',       text: "Why does everyone expect me to be okay? I am not okay. I haven't been okay in months and nobody seems to actually notice or care.", distress: 0.75, likes: 18, dislikes: 2 },
  { anon: 'Golden Moth',          color: '#22c55e', mood: 'hopeful',     text: "Started journaling every morning this week. Small thing, but it's helping me notice when anxiety starts creeping in. Sharing in case it helps someone else too.", distress: 0.08, likes: 27, dislikes: 0 },
  { anon: 'Fading Echo',          color: '#a78bfa', mood: 'numb',        text: "I don't feel sad or happy anymore. Just... nothing. I go through the motions every day and wonder if this is just what life is now.", distress: 0.71, likes: 16, dislikes: 0 },
  { anon: 'Rising Tide',          color: '#34d399', mood: 'hopeful',     text: "Six months ago I couldn't get out of bed. Today I went for a run. Recovery isn't linear but it's real. Keep going 💚", distress: 0.04, likes: 45, dislikes: 0 },
];

// ─── Doctors ─────────────────────────────────────────────────────────────────
const doctors = [
  { name: 'Dr. Ananya Rao',  username: 'dr_ananya',  email: 'ananya@sahara.ngo',  password: 'doctor123', age: 38, role: 'doctor', specialties: ['Crisis Intervention', 'Trauma', 'Suicidal Ideation'], bio: "I'm here to help you through the hardest moments. You are not alone.", qualification: 'MBBS, MD Psychiatry', experience: 12, casesResolved: 284, activeCases: 2, zoomLink: 'https://zoom.us/j/sahara-ananya', status: 'available', rating: 4.9 },
  { name: 'Dr. Kiran Mehta', username: 'dr_kiran',   email: 'kiran@sahara.ngo',   password: 'doctor123', age: 45, role: 'doctor', specialties: ['Depression', 'Anxiety Disorders', 'PTSD'],             bio: 'Fifteen years of crisis care. Every life matters.', qualification: 'MBBS, DPM, DNB Psychiatry', experience: 15, casesResolved: 412, activeCases: 1, zoomLink: 'https://zoom.us/j/sahara-kiran', status: 'available', rating: 5.0 },
  { name: 'Dr. Preethi Nair',username: 'dr_preethi', email: 'preethi@sahara.ngo', password: 'doctor123', age: 34, role: 'doctor', specialties: ['Youth Mental Health', 'Self-harm', 'Grief'],           bio: 'Specializing in youth crisis support. Reach out anytime.', qualification: 'MBBS, MD Psychiatry', experience: 8, casesResolved: 196, activeCases: 0, zoomLink: 'https://zoom.us/j/sahara-preethi', status: 'away', rating: 4.8 },
];

// ─── Mentors ──────────────────────────────────────────────────────────────────
const mentors = [
  { name: 'Priya M.',  username: 'priya_m',   email: 'priya@mindbridge.ngo',  password: 'mentor123', age: 28, role: 'mentor', specialties: ['Anxiety', 'Academic Stress', 'Loneliness'],    bio: "I'm here to listen, not judge.",           status: 'available', sessions: 142, rating: 4.9 },
  { name: 'Arjun K.',  username: 'arjun_k',   email: 'arjun@mindbridge.ngo',  password: 'mentor123', age: 32, role: 'mentor', specialties: ['Depression', 'Family Issues', 'Career'],        bio: 'Trained in emotional first aid.',          status: 'available', sessions: 89,  rating: 4.8 },
  { name: 'Sneha R.',  username: 'sneha_r',   email: 'sneha@mindbridge.ngo',  password: 'mentor123', age: 26, role: 'mentor', specialties: ['Relationships', 'Self-esteem', 'Grief'],         bio: 'Your feelings are valid.',                 status: 'available', sessions: 201, rating: 5.0 },
  { name: 'Rahul D.',  username: 'rahul_d',   email: 'rahul@mindbridge.ngo',  password: 'mentor123', age: 35, role: 'mentor', specialties: ['Panic Attacks', 'Trauma', 'Identity'],           bio: "Here when you're ready to talk.",          status: 'away',      sessions: 67,  rating: 4.7 },
  { name: 'Meera T.',  username: 'meera_t',   email: 'meera@mindbridge.ngo',  password: 'mentor123', age: 29, role: 'mentor', specialties: ['Body Image', 'Social Anxiety', 'Burnout'],       bio: 'Small steps are still steps forward.',     status: 'available', sessions: 178, rating: 4.9 },
  { name: 'Vikram P.', username: 'vikram_p',  email: 'vikram@mindbridge.ngo', password: 'mentor123', age: 31, role: 'mentor', specialties: ['Study Stress', 'Peer Pressure', 'Motivation'],   bio: 'You reached out — that took courage.',     status: 'available', sessions: 54,  rating: 4.6 },
];

// ─── Demo users with rich analytics data ─────────────────────────────────────
// Each user has a distinct mood arc over 30 days for interesting health card charts
const demoUsers = [
  {
    user: { name: 'Aanya Sharma', username: 'aanya_s', email: 'aanya@demo.com', password: 'demo1234', age: 19, role: 'user' },
    // Recovering arc: starts low, improves steadily
    moodPattern: [2,2,1,2,3,2,3,3,4,3,4,4,3,4,4,5,4,4,5,4,5,5,4,5,5,4,5,5,4,5],
    journals: [
      { title: 'First day journaling', content: "Feeling really low today. Exams are piling up and I don't know where to start. Trying this journaling thing.", mood: 'overwhelmed', emoji: '😵' },
      { title: 'Small win', content: "Finished one chapter today. It's not much but it felt good. Mood is slowly getting better.", mood: 'hopeful', emoji: '🌱' },
      { title: 'Better week', content: "Had a good chat with a mentor yesterday. Feeling more grounded. The anxiety is still there but manageable.", mood: 'okay', emoji: '😐' },
    ],
    sessions: [
      { volunteerName: 'Priya M.', messages: [{ from:'user', text:'I feel so overwhelmed with exams' }, { from:'volunteer', text:'That sounds really hard. Tell me more.' }, { from:'user', text:'I just cant focus at all' }, { from:'volunteer', text:'Lets try breaking it into smaller pieces together.' }], escalated: false, duration: 22 },
    ],
  },
  {
    user: { name: 'Rohan Verma', username: 'rohan_v', email: 'rohan@demo.com', password: 'demo1234', age: 21, role: 'user' },
    // Crisis arc: high distress, escalation, then recovery
    moodPattern: [3,3,2,2,1,1,2,1,1,2,2,3,2,3,3,3,4,3,4,4,3,4,4,5,4,4,5,4,5,4],
    journals: [
      { title: 'Dark days', content: "I don't want to talk to anyone. Everything feels pointless. I know I should reach out but I can't.", mood: 'numb', emoji: '😶' },
      { title: 'After the SOS call', content: "Called the helpline last night. It helped more than I expected. I'm still not okay but I feel less alone.", mood: 'sad', emoji: '😔' },
      { title: 'Week 3', content: "Slowly getting back to normal. Started going for walks. The mentor sessions are helping a lot.", mood: 'okay', emoji: '😐' },
    ],
    sessions: [
      { volunteerName: 'Rahul D.', messages: [{ from:'user', text:'I think I need help' }, { from:'volunteer', text:'I am here. What is going on?' }, { from:'user', text:'Everything feels too much' }, { from:'volunteer', text:'You did the right thing reaching out.' }], escalated: true, duration: 45 },
      { volunteerName: 'Sneha R.', messages: [{ from:'user', text:'Feeling a bit better today' }, { from:'volunteer', text:'That is great to hear! What helped?' }, { from:'user', text:'The walk you suggested' }], escalated: false, duration: 18 },
    ],
  },
  {
    user: { name: 'Preethi Nair', username: 'preethi_n', email: 'preethi@demo.com', password: 'demo1234', age: 22, role: 'user' },
    // Stable high performer: consistently good mood with minor dips
    moodPattern: [4,5,4,4,5,5,4,3,4,5,4,5,5,4,5,4,5,5,4,5,5,5,4,5,5,4,5,5,5,4],
    journals: [
      { title: 'Gratitude log', content: "Three things I am grateful for today: morning tea, a good conversation, and the fact that I asked for help when I needed it.", mood: 'great', emoji: '😄' },
      { title: 'Mindfulness practice', content: "Did 10 minutes of breathing exercises. Noticed I was less reactive in a stressful meeting. Progress!", mood: 'good', emoji: '🙂' },
    ],
    sessions: [
      { volunteerName: 'Meera T.', messages: [{ from:'user', text:'Just wanted to check in and say I am doing well' }, { from:'volunteer', text:'That is wonderful to hear!' }], escalated: false, duration: 12 },
    ],
  },
  {
    user: { name: 'Karan Mehta', username: 'karan_m', email: 'karan@demo.com', password: 'demo1234', age: 20, role: 'user' },
    // Volatile pattern: lots of ups and downs
    moodPattern: [3,5,2,4,1,3,5,2,4,1,3,4,2,5,1,3,4,2,5,3,4,2,4,3,5,2,4,3,4,3],
    journals: [
      { title: 'Good day bad day', content: "Yesterday was amazing, today is terrible. I wish I could predict my own moods. The inconsistency is exhausting.", mood: 'overwhelmed', emoji: '😵' },
      { title: 'Trying to find patterns', content: "Looking at my mood logs — I notice I crash after social events. Maybe I am more introverted than I thought.", mood: 'okay', emoji: '😐' },
    ],
    sessions: [
      { volunteerName: 'Arjun K.', messages: [{ from:'user', text:'My moods are all over the place' }, { from:'volunteer', text:'That sounds exhausting. How long has this been happening?' }, { from:'user', text:'Months now' }, { from:'volunteer', text:'Lets explore what might be triggering the swings.' }], escalated: false, duration: 30 },
    ],
  },
  {
    user: { name: 'Divya Pillai', username: 'divya_p', email: 'divya@demo.com', password: 'demo1234', age: 23, role: 'user' },
    // Gradual decline then plateau: burnout pattern
    moodPattern: [5,5,4,5,4,4,3,4,3,3,4,3,3,2,3,3,2,3,2,2,3,2,2,3,2,3,3,2,3,3],
    journals: [
      { title: 'Burnout is real', content: "I used to love my work. Now I dread Mondays. I am always tired even after sleeping 9 hours. Something has to change.", mood: 'low', emoji: '😔' },
      { title: 'Setting boundaries', content: "Said no to an extra project today. It felt uncomfortable but also right. Small step.", mood: 'okay', emoji: '😐' },
    ],
    sessions: [
      { volunteerName: 'Meera T.', messages: [{ from:'user', text:'I think I am burning out' }, { from:'volunteer', text:'Burnout is serious. What does your day look like right now?' }, { from:'user', text:'Work from 8am to 10pm most days' }, { from:'volunteer', text:'That is not sustainable. Lets talk about what you can change.' }], escalated: false, duration: 35 },
    ],
  },
];

// ─── Main seed ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB. Starting seed...\n');

  // 1. Wipe everything
  await Promise.all([
    User.deleteMany({}),
    Clinic.deleteMany({}),
    Vent.deleteMany({}),
    MoodLog.deleteMany({}),
    ChatSession.deleteMany({}),
    Journal.deleteMany({}),
  ]);
  console.log('🗑  Cleared all existing data');

  // 2. Admin
  await User.create({
    name: 'Admin', username: 'admin', email: 'admin@mindbridge.ngo',
    password: 'admin123', age: 30, role: 'admin',
  });
  console.log('👤 Admin created  →  username: admin  /  password: admin123');

  // 3. Mentors
  for (const m of mentors) await User.create(m);
  console.log('🤝 Mentors seeded →  password: mentor123');
  mentors.forEach(m => console.log(`   @${m.username}  (${m.name})`));

  // 4. Doctors
  for (const d of doctors) await User.create(d);
  console.log('🏥 Doctors seeded →  password: doctor123');
  doctors.forEach(d => console.log(`   @${d.username}  (${d.name})`));

  // 4. Demo users + their analytics data
  console.log('\n👥 Demo users + analytics:');
  for (const demo of demoUsers) {
    const user = await User.create(demo.user);
    const uid  = user._id;

    // Mood logs
    const logs = makeMoodLogs(uid, demo.moodPattern);
    await MoodLog.insertMany(logs);

    // Chat sessions
    for (const s of demo.sessions) {
      const d = daysAgo(Math.floor(Math.random() * 20) + 1);
      await ChatSession.create({ userId: uid, ...s, createdAt: d, updatedAt: d });
    }

    // Journal entries
    for (let i = 0; i < demo.journals.length; i++) {
      const d = daysAgo(demo.journals.length - i + Math.floor(Math.random() * 3));
      await Journal.create({ userId: uid, ...demo.journals[i], createdAt: d, updatedAt: d });
    }

    console.log(`   @${demo.user.username}  (${demo.user.name})  →  ${logs.length} mood logs, ${demo.sessions.length} sessions, ${demo.journals.length} journal entries`);
  }

  // 5. Clinics
  await Clinic.insertMany(clinics);
  console.log('\n🏥 Clinics seeded');

  // 6. Vents
  await Vent.insertMany(seedVents);
  console.log('🌊 Vents seeded');

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin   →  username: admin       / password: admin123');
  console.log('  Mentor  →  username: priya_m     / password: mentor123');
  console.log('  User    →  username: aanya_s     / password: demo1234  (recovering arc)');
  console.log('  User    →  username: rohan_v     / password: demo1234  (crisis + recovery)');
  console.log('  User    →  username: preethi_n   / password: demo1234  (stable/high)');
  console.log('  User    →  username: karan_m     / password: demo1234  (volatile)');
  console.log('  Doctor  →  username: dr_ananya    / password: doctor123');
  console.log('  Doctor  →  username: dr_kiran     / password: doctor123');
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
