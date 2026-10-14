const router = require('express').Router();
const db = require('../db');
const { wrap, idParam, bad, isDate } = require('../util');

idParam(router);

const SELECT = `SELECT r.id, r.title, r.due_date, r.done, r.animal_id, a.name AS animal_name
                FROM reminders r LEFT JOIN animals a ON a.id = r.animal_id`;

// GET /api/reminders?done=false&animal_id=2
router.get('/', wrap(async (req, res) => {
  const done = req.query.done === undefined ? null : req.query.done === 'true';
  const animal = req.query.animal_id === undefined ? null : Number(req.query.animal_id);
  if (animal !== null && !Number.isInteger(animal)) return bad(res, 'animal_id must be a number');
  const { rows } = await db.query(
    `${SELECT} WHERE ($1::boolean IS NULL OR r.done = $1) AND ($2::int IS NULL OR r.animal_id = $2)
     ORDER BY r.due_date, r.id`,
    [done, animal]
  );
  res.json(rows);
}));

// GET /api/reminders/:id
router.get('/:id', wrap(async (req, res) => {
  const { rows } = await db.query(`${SELECT} WHERE r.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' });
  res.json(rows[0]);
}));

// POST /api/reminders  { title, due_date: "2026-11-02", animal_id? }
router.post('/', wrap(async (req, res) => {
  const { title, due_date, animal_id = null } = req.body;
  if (!title || !title.trim()) return bad(res, 'title is required');
  if (!isDate(due_date)) return bad(res, 'due_date must look like 2026-11-02');
  const { rows } = await db.query(
    'INSERT INTO reminders (animal_id, title, due_date) VALUES ($1, $2, $3) RETURNING id',
    [animal_id, title.trim(), due_date]
  );
  const full = await db.query(`${SELECT} WHERE r.id = $1`, [rows[0].id]);
  res.status(201).json(full.rows[0]);
}));

// PUT or PATCH /api/reminders/:id  – update title, due_date, done
const update = wrap(async (req, res) => {
  const { title, due_date, done } = req.body;
  if (title !== undefined && !String(title).trim()) return bad(res, 'title cannot be empty');
  if (due_date !== undefined && !isDate(due_date)) return bad(res, 'due_date must look like 2026-11-02');
  if (done !== undefined && typeof done !== 'boolean') return bad(res, 'done must be true or false');
  const { rows } = await db.query(
    `UPDATE reminders SET title = COALESCE($1, title), due_date = COALESCE($2, due_date), done = COALESCE($3, done)
     WHERE id = $4 RETURNING id`,
    [title?.trim() ?? null, due_date ?? null, done ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' });
  const full = await db.query(`${SELECT} WHERE r.id = $1`, [rows[0].id]);
  res.json(full.rows[0]);
});
router.put('/:id', update);
router.patch('/:id', update);

// DELETE /api/reminders/:id
router.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM reminders WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Reminder not found' });
  res.status(204).end();
}));

module.exports = router;
