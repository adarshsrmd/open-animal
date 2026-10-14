require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const content = require('./routes/content');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

// ---------- API ----------
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database unavailable' });
  }
});
app.use('/api/animals', require('./routes/animals'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/diseases', content.diseases);
app.use('/api/articles', content.articles);
app.use('/api/vets', content.vets);
app.use('/api/saved', content.saved);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Website (files in /public) ----------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- Error handler ----------
const PG_ERRORS = {
  '22P02': [400, 'Invalid input'],
  '22007': [400, 'Invalid date'],
  '22008': [400, 'Invalid date'],
  '23502': [400, 'A required field is missing'],
  '23503': [400, 'Related record does not exist'],
  '23514': [400, 'Value not allowed'],
};
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  const known = PG_ERRORS[err.code];
  if (known) return res.status(known[0]).json({ error: known[1] });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
