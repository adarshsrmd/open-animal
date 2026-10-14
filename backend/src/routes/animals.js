const router = require('express').Router();
const db = require('../db');
const { wrap, idParam, bad } = require('../util');

idParam(router);

const TYPES = ['Cow', 'Goat', 'Dog', 'Chicken', 'Sheep', 'Horse', 'Cat'];
const STATUSES = ['Healthy', 'Vaccination Due'];

// GET /api/animals  – list all animals
router.get('/', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM animals ORDER BY id');
  res.json(rows);
}));

// GET /api/animals/:id  – one animal with its records and reminders
router.get('/:id', wrap(async (req, res) => {
  const animal = await db.query('SELECT * FROM animals WHERE id = $1', [req.params.id]);
  if (!animal.rows[0]) return res.status(404).json({ error: 'Animal not found' });
  const [records, reminders] = await Promise.all([
    db.query('SELECT id, note, recorded_on FROM animal_records WHERE animal_id = $1 ORDER BY recorded_on DESC, id DESC', [req.params.id]),
    db.query('SELECT id, title, due_date, done FROM reminders WHERE animal_id = $1 ORDER BY due_date', [req.params.id]),
  ]);
  res.json({ ...animal.rows[0], records: records.rows, reminders: reminders.rows });
}));

// POST /api/animals  – create
router.post('/', wrap(async (req, res) => {
  const { name, type, age = 0, note = '' } = req.body;
  if (!name || !name.trim()) return bad(res, 'name is required');
  if (!TYPES.includes(type)) return bad(res, 'type must be one of: ' + TYPES.join(', '));
  if (!Number.isInteger(age) || age < 0 || age > 40) return bad(res, 'age must be a whole number from 0 to 40');
  const { rows } = await db.query(
    'INSERT INTO animals (name, type, age, note) VALUES ($1, $2, $3, $4) RETURNING *',
    [name.trim(), type, age, note]
  );
  res.status(201).json(rows[0]);
}));

// PUT or PATCH /api/animals/:id  – update any of name, age, note, status
const update = wrap(async (req, res) => {
  const { name, age, note, status } = req.body;
  if (name !== undefined && !String(name).trim()) return bad(res, 'name cannot be empty');
  if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 40)) return bad(res, 'age must be a whole number from 0 to 40');
  if (status !== undefined && !STATUSES.includes(status)) return bad(res, 'status must be one of: ' + STATUSES.join(', '));
  const { rows } = await db.query(
    `UPDATE animals SET name = COALESCE($1, name), age = COALESCE($2, age),
       note = COALESCE($3, note), status = COALESCE($4, status)
     WHERE id = $5 RETURNING *`,
    [name?.trim() ?? null, age ?? null, note ?? null, status ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Animal not found' });
  res.json(rows[0]);
});
router.put('/:id', update);
router.patch('/:id', update);

// DELETE /api/animals/:id
router.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM animals WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Animal not found' });
  res.status(204).end();
}));

// POST /api/animals/:id/records  – add a health record
router.post('/:id/records', wrap(async (req, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) return bad(res, 'note is required');
  const { rows } = await db.query(
    'INSERT INTO animal_records (animal_id, note) SELECT id, $2 FROM animals WHERE id = $1 RETURNING *',
    [req.params.id, note.trim()]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Animal not found' });
  res.status(201).json(rows[0]);
}));

module.exports = router;
