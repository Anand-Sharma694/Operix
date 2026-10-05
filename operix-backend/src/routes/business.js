const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/business
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM businesses WHERE user_id = $1', [req.user.id]);
    res.json({ business: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/business
router.post('/', [
  body('name').trim().isLength({ min: 2 }),
  body('type').trim().notEmpty(),
  body('category').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, category } = req.body;
    const existing = await db.query('SELECT id FROM businesses WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Business already set up' });
    }

    const result = await db.query(
      'INSERT INTO businesses (user_id, name, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, type, category]
    );

    res.status(201).json({ business: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/business
router.put('/', [
  body('name').trim().isLength({ min: 2 }),
  body('type').trim().notEmpty(),
  body('category').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, category } = req.body;
    const result = await db.query(
      'UPDATE businesses SET name = $1, type = $2, category = $3 WHERE user_id = $4 RETURNING *',
      [name, type, category, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
