// Read-only reference content (diseases, articles, vets) plus saved articles
const express = require('express');
const db = require('../db');
const { wrap } = require('../util');

const diseases = express.Router();
const articles = express.Router();
const vets = express.Router();
const saved = express.Router();

// GET /api/diseases                      – all diseases
// GET /api/diseases?symptom=Fever&symptom=Drooling  – symptom checker, best matches first
diseases.get('/', wrap(async (req, res) => {
  const symptoms = [].concat(req.query.symptom || []);
  if (!symptoms.length) {
    const { rows } = await db.query('SELECT * FROM diseases ORDER BY name');
    return res.json(rows);
  }
  const { rows } = await db.query(
    `SELECT *, cardinality(ARRAY(SELECT unnest(symptoms) INTERSECT SELECT unnest($1::text[]))) AS matches
     FROM diseases WHERE symptoms && $1::text[] ORDER BY matches DESC, name`,
    [symptoms]
  );
  res.json(rows);
}));

diseases.get('/:id', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM diseases WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Disease not found' });
  res.json(rows[0]);
}));

// GET /api/articles?tag=Cattle&q=vaccine
articles.get('/', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, tag, title, description, minutes FROM articles
     WHERE ($1::text IS NULL OR tag = $1)
       AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
     ORDER BY title`,
    [req.query.tag || null, req.query.q || null]
  );
  res.json(rows);
}));

articles.get('/:id', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT a.*, (s.article_id IS NOT NULL) AS saved
     FROM articles a LEFT JOIN saved_articles s ON s.article_id = a.id WHERE a.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Article not found' });
  res.json(rows[0]);
}));

// GET /api/vets?type=Vet&open24h=true
vets.get('/', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM vets
     WHERE ($1::text IS NULL OR type = $1) AND ($2::boolean IS NOT TRUE OR open_24h)
     ORDER BY distance_km`,
    [req.query.type || null, req.query.open24h === 'true']
  );
  res.json(rows);
}));

vets.get('/:id', wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const { rows } = await db.query('SELECT * FROM vets WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Vet not found' });
  res.json(rows[0]);
}));

// GET /api/saved               – saved articles
// PUT /api/saved/:articleId    – save one
// DELETE /api/saved/:articleId – unsave one
saved.get('/', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT a.id, a.tag, a.title, a.description, a.minutes
     FROM saved_articles s JOIN articles a ON a.id = s.article_id ORDER BY s.saved_at DESC`
  );
  res.json(rows);
}));

saved.put('/:articleId', wrap(async (req, res) => {
  const { rowCount } = await db.query(
    'INSERT INTO saved_articles (article_id) SELECT id FROM articles WHERE id = $1 ON CONFLICT DO NOTHING',
    [req.params.articleId]
  );
  const exists = await db.query('SELECT 1 FROM articles WHERE id = $1', [req.params.articleId]);
  if (!exists.rows[0]) return res.status(404).json({ error: 'Article not found' });
  res.status(rowCount ? 201 : 200).json({ article_id: req.params.articleId, saved: true });
}));

saved.delete('/:articleId', wrap(async (req, res) => {
  await db.query('DELETE FROM saved_articles WHERE article_id = $1', [req.params.articleId]);
  res.status(204).end();
}));

module.exports = { diseases, articles, vets, saved };
