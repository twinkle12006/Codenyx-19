require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/vents',      require('./routes/vents'));
app.use('/api/mood',       require('./routes/mood'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/clinics',    require('./routes/clinics'));
app.use('/api/stats',      require('./routes/stats'));
app.use('/api/healthcard', require('./routes/healthcard'));
app.use('/api/journal',    require('./routes/journal'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/mentor',     require('./routes/mentor'));
app.use('/api/chat',       require('./routes/chat'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.error('DB connection error:', err));
