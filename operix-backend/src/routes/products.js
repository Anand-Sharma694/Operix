const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: get business for user
async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const result = await db.query(
      'SELECT * FROM products WHERE business_id = $1 AND is_active = TRUE ORDER BY name',
      [biz.id]
    );
    res.json({ products: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const result = await db.query(
      'SELECT * FROM products WHERE id = $1 AND business_id = $2',
      [req.params.id, biz.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const { name, sku, category, unit_price, current_stock, reorder_level } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });
    const result = await db.query(
      'INSERT INTO products (business_id, name, sku, category, unit_price, current_stock, reorder_level) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [biz.id, name, sku || null, category || null, unit_price || 0, current_stock || 0, reorder_level || 10]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const { name, sku, category, unit_price, current_stock, reorder_level } = req.body;
    const result = await db.query(
      'UPDATE products SET name=$1, sku=$2, category=$3, unit_price=$4, current_stock=$5, reorder_level=$6 WHERE id=$7 AND business_id=$8 RETURNING *',
      [name, sku, category, unit_price, current_stock, reorder_level, req.params.id, biz.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
