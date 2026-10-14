// Lets route handlers be async without try/catch in every one
exports.wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Rejects non-numeric :id values before they reach the database
exports.idParam = (router) =>
  router.param('id', (req, res, next, id) =>
    /^\d+$/.test(id) ? next() : res.status(400).json({ error: 'Invalid id' })
  );

exports.bad = (res, message) => res.status(400).json({ error: message });
exports.isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
