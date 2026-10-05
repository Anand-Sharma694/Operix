const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// GET /api/analytics/dashboard - main KPIs
router.get('/dashboard', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    // Revenue & orders - current 30d vs previous 30d
    const kpiResult = await db.query(
      `SELECT
         SUM(CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN revenue ELSE 0 END) as revenue_30d,
         SUM(CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '60 days' AND sale_date < CURRENT_DATE - INTERVAL '30 days' THEN revenue ELSE 0 END) as revenue_prev_30d,
         SUM(CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN quantity ELSE 0 END) as units_30d,
         COUNT(DISTINCT CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN id END) as orders_30d,
         SUM(revenue) as total_revenue_all,
         COUNT(*) as total_orders_all
       FROM sales WHERE business_id = $1`,
      [biz.id]
    );

    // Inventory summary
    const invResult = await db.query(
      `SELECT
         SUM(current_stock) as total_inventory,
         COUNT(*) as total_products,
         SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock_count,
         SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count
       FROM products WHERE business_id = $1 AND is_active = TRUE`,
      [biz.id]
    );

    const kpi = kpiResult.rows[0];
    const inv = invResult.rows[0];
    const revenue30d = parseFloat(kpi.revenue_30d) || 0;
    const revenuePrev30d = parseFloat(kpi.revenue_prev_30d) || 0;
    const revenueGrowth = revenuePrev30d > 0
      ? ((revenue30d - revenuePrev30d) / revenuePrev30d) * 100
      : null;

    // Simple health score calculation
    const healthFactors = [];
    if (revenue30d > 0) healthFactors.push(30);
    if (revenueGrowth !== null && revenueGrowth >= 0) healthFactors.push(20);
    const lowStockPct = inv.total_products > 0 ? inv.low_stock_count / inv.total_products : 0;
    if (lowStockPct < 0.3) healthFactors.push(25);
    if (inv.out_of_stock_count === 0) healthFactors.push(25);
    const healthScore = healthFactors.reduce((a, b) => a + b, 0);

    res.json({
      health_score: healthScore,
      revenue_30d: revenue30d,
      revenue_prev_30d: revenuePrev30d,
      revenue_growth: revenueGrowth !== null ? Math.round(revenueGrowth * 10) / 10 : null,
      units_30d: parseInt(kpi.units_30d) || 0,
      orders_30d: parseInt(kpi.orders_30d) || 0,
      total_revenue: parseFloat(kpi.total_revenue_all) || 0,
      total_orders: parseInt(kpi.total_orders_all) || 0,
      total_inventory: parseInt(inv.total_inventory) || 0,
      total_products: parseInt(inv.total_products) || 0,
      low_stock_count: parseInt(inv.low_stock_count) || 0,
      out_of_stock_count: parseInt(inv.out_of_stock_count) || 0,
      business: { name: biz.name, type: biz.type, category: biz.category, is_demo: biz.is_demo },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
