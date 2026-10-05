const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// GET /api/inventory - inventory status for all products
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    // Get products with their avg daily sales over last 30 days
    const result = await db.query(
      `SELECT p.id, p.name, p.category, p.current_stock, p.reorder_level, p.unit_price,
         COALESCE(agg.avg_daily, 0) as avg_daily_sales,
         COALESCE(agg.total_30d, 0) as total_units_30d
       FROM products p
       LEFT JOIN (
         SELECT product_id,
           SUM(quantity)::float / 30 as avg_daily,
           SUM(quantity) as total_30d
         FROM sales
         WHERE business_id = $1
           AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY product_id
       ) agg ON agg.product_id = p.id
       WHERE p.business_id = $1 AND p.is_active = TRUE
       ORDER BY p.name`,
      [biz.id]
    );

    const inventory = result.rows.map(row => {
      const avgDaily = parseFloat(row.avg_daily_sales) || 0;
      const daysRemaining = avgDaily > 0 ? Math.floor(row.current_stock / avgDaily) : null;
      const suggestedReorder = avgDaily > 0 ? Math.ceil(avgDaily * 30) : row.reorder_level * 3;

      let status = 'healthy';
      if (row.current_stock <= 0) status = 'critical';
      else if (row.current_stock <= row.reorder_level) status = 'low_stock';
      else if (avgDaily > 0 && row.current_stock > avgDaily * 60) status = 'overstock';

      return {
        ...row,
        avg_daily_sales: Math.round(avgDaily * 10) / 10,
        days_remaining: daysRemaining,
        suggested_reorder: suggestedReorder,
        status,
      };
    });

    res.json({ inventory });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
