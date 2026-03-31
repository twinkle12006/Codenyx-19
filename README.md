# Sahara — Mental Health Support Platform

## Setup

### Backend
```bash
cd backend
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev            # runs on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # runs on port 5173
```

MongoDB must be running locally, or set MONGO_URI to your Atlas connection string.

## Features
- Anonymous usernames (regeneratable every 7 days)
- Community vents with nested likes/dislikes/comments/replies
- Volunteer chat with WhatsApp-quality UX (ticks, typing indicator, date separators)
- Volunteer busy status with real-time socket updates
- Post-session star ratings
- Resource library (volunteers upload videos, users browse/like)
- SOS page with NGO doctor cards + Jitsi video/audio calls
