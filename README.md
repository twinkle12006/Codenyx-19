# Sahara — Mental Health Ecosystem

A stepped-care mental health platform built with React, Express, and MongoDB Atlas.

---

## Tech Stack

- Frontend: React (Create React App)
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Auth: JWT + bcrypt

---

## Project Structure

```
MindBridge/
├── client/          # React frontend
│   └── src/
│       ├── api/         # Axios API calls
│       ├── context/     # Auth context
│       └── components/  # UI components + sections
├── server/          # Express backend
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API routes
│   ├── .env         # Environment variables
│   └── index.js     # Entry point
├── index.html       # Original HTML prototype
├── index.css        # Original CSS
└── app.js           # Original JS
```

---

## Getting Started

### 1. Set up MongoDB Atlas

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in
2. Create a new project and click **Build a Database**
3. Choose the **Free (M0)** tier and pick a cloud region
4. Create a database user — note the **username** and **password**
5. Under **Network Access**, click **Add IP Address** → choose **Allow Access from Anywhere** (0.0.0.0/0) for development
6. Go to **Database** → click **Connect** → **Drivers** → copy the connection string

It looks like this:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mindbridge?retryWrites=true&w=majority
```

### 2. Configure the backend

Open `server/.env` and replace the placeholders with your actual values:

```env
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/mindbridge?retryWrites=true&w=majority
JWT_SECRET=mindbridge_super_secret_key
PORT=5000
```

> Make sure to replace `<username>`, `<password>`, and `<cluster>` with your real Atlas credentials.

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Run the app

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd server
node index.js
```
You should see:
```
MongoDB connected
Server running on port 5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm start
```

App opens at [http://localhost:3000](http://localhost:3000)

---

## Features

- Sign up / Sign in with JWT auth stored in localStorage
- Passwords hashed with bcrypt before saving to MongoDB
- Vent Mode — anonymous posts with AI distress detection
- I Need Help — volunteer chat with escalation flow
- SOS Crisis — therapist connect + live clinic map
- Digital Health Card — mood chart + support history
- Live activity ticker + notification bell

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Port for the Express server (default: 5000) |

---

## Notes

- Never commit your `.env` file — add it to `.gitignore`
- Change `JWT_SECRET` to a long random string in production
- For production, restrict MongoDB Atlas network access to your server's IP
