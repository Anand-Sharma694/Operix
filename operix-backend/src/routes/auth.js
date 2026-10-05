const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
      [email, password_hash, full_name]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, created_at: user.created_at },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, email, full_name, created_at FROM users WHERE id = $1', [req.user.id]);
    const businessResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [req.user.id]);
    res.json({ user: result.rows[0], business: businessResult.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
