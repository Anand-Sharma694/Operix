const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// GET /api/sales?period=30d
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const days = parseInt(req.query.days) || 30;
    const result = await db.query(
      `SELECT s.*, p.name as product_name, p.category as product_category
       FROM sales s JOIN products p ON s.product_id = p.id
       WHERE s.business_id = $1 AND s.sale_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY s.sale_date DESC`,
      [biz.id]
    );
    res.json({ sales: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/sales/trend?days=30
router.get('/trend', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const days = parseInt(req.query.days) || 30;
    const result = await db.query(
      `SELECT sale_date, SUM(quantity) as total_units, SUM(revenue) as total_revenue, COUNT(*) as order_count
       FROM sales
       WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY sale_date ORDER BY sale_date ASC`,
      [biz.id]
    );
    res.json({ trend: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/sales/by-product?days=30
router.get('/by-product', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });
    const days = parseInt(req.query.days) || 30;
    const result = await db.query(
      `SELECT p.id, p.name, p.category,
         SUM(s.quantity) as total_units,
         SUM(s.revenue) as total_revenue,
         COUNT(*) as order_count
       FROM sales s JOIN products p ON s.product_id = p.id
       WHERE s.business_id = $1 AND s.sale_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY p.id, p.name, p.category
       ORDER BY total_revenue DESC`,
      [biz.id]
    );
    res.json({ products: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
