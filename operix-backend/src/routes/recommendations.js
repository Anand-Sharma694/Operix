const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

async function computeRecommendations(bizId) {
  const recs = [];

  const result = await db.query(
    `SELECT p.id, p.name, p.current_stock, p.reorder_level, p.unit_price,
       COALESCE(s30.avg_daily, 0) as avg_daily_30d,
       COALESCE(s30.total_rev, 0) as revenue_30d,
       COALESCE(s30.total_units, 0) as units_30d,
       COALESCE(sprev.avg_daily, 0) as avg_daily_prev,
       COALESCE(sprev.total_rev, 0) as revenue_prev
     FROM products p
     LEFT JOIN (
       SELECT product_id, SUM(quantity)::float/30 as avg_daily, SUM(revenue) as total_rev, SUM(quantity) as total_units
       FROM sales WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY product_id
     ) s30 ON s30.product_id = p.id
     LEFT JOIN (
       SELECT product_id, SUM(quantity)::float/30 as avg_daily, SUM(revenue) as total_rev
       FROM sales WHERE business_id = $1
         AND sale_date >= CURRENT_DATE - INTERVAL '60 days'
         AND sale_date < CURRENT_DATE - INTERVAL '30 days'
       GROUP BY product_id
     ) sprev ON sprev.product_id = p.id
     WHERE p.business_id = $1 AND p.is_active = TRUE`,
    [bizId]
  );

  for (const p of result.rows) {
    const avgDaily = parseFloat(p.avg_daily_30d) || 0;
    const avgDailyPrev = parseFloat(p.avg_daily_prev) || 0;
    const stock = parseInt(p.current_stock) || 0;
    const revenue30d = parseFloat(p.revenue_30d) || 0;
    const revenuePrev = parseFloat(p.revenue_prev) || 0;

    // Reorder recommendation
    if (avgDaily > 0 && stock / avgDaily < 14) {
      const daysLeft = Math.round(stock / avgDaily);
      const orderQty = Math.ceil(avgDaily * 30);
      recs.push({
        product_id: p.id,
        product_name: p.name,
        rec_type: 'reorder',
        priority: daysLeft < 7 ? 'high' : 'medium',
        title: `Reorder ${p.name}`,
        description: `${p.name} may run out within ${daysLeft} day(s) based on recent sales velocity of ${Math.round(avgDaily * 10) / 10} units/day. Consider ordering approximately ${orderQty} units.`,
        metric_value: orderQty,
        metric_label: 'suggested units',
      });
    }

    // Overstock reduction
    if (avgDaily > 0 && stock > avgDaily * 60) {
      const excessDays = Math.round(stock / avgDaily);
      recs.push({
        product_id: p.id,
        product_name: p.name,
        rec_type: 'reduce_orders',
        priority: 'low',
        title: `Reduce orders for ${p.name}`,
        description: `${p.name} has ${excessDays} days of inventory based on current sales. Consider pausing or reducing new orders to avoid over-investment in this product.`,
        metric_value: excessDays,
        metric_label: 'days of supply',
      });
    }

    // Strong performer
    if (avgDailyPrev > 0 && avgDaily > avgDailyPrev * 1.2) {
      const growthPct = Math.round(((avgDaily - avgDailyPrev) / avgDailyPrev) * 100);
      recs.push({
        product_id: p.id,
        product_name: p.name,
        rec_type: 'opportunity',
        priority: 'medium',
        title: `${p.name} is a growth opportunity`,
        description: `Sales for ${p.name} are up ${growthPct}% compared to the previous period. Consider increasing inventory and marketing investment for this product.`,
        metric_value: growthPct,
        metric_label: '% sales growth',
      });
    }

    // Revenue decline
    if (revenuePrev > 0 && revenue30d < revenuePrev * 0.75) {
      const dropPct = Math.round(((revenuePrev - revenue30d) / revenuePrev) * 100);
      recs.push({
        product_id: p.id,
        product_name: p.name,
        rec_type: 'investigate',
        priority: 'medium',
        title: `Investigate ${p.name} revenue drop`,
        description: `Revenue from ${p.name} dropped ${dropPct}% this period ($${revenue30d.toFixed(0)} vs $${revenuePrev.toFixed(0)} previously). Review pricing, availability, and customer feedback.`,
        metric_value: dropPct,
        metric_label: '% revenue drop',
      });
    }
  }

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => order[a.priority] - order[b.priority]);

  return recs;
}

// GET /api/recommendations
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const recs = await computeRecommendations(biz.id);

    // Save to DB
    await db.query('DELETE FROM recommendations WHERE business_id = $1 AND is_dismissed = FALSE', [biz.id]);
    for (const rec of recs) {
      await db.query(
        `INSERT INTO recommendations (business_id, product_id, rec_type, priority, title, description, metric_value, metric_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [biz.id, rec.product_id, rec.rec_type, rec.priority, rec.title, rec.description, rec.metric_value, rec.metric_label]
      );
    }

    res.json({ recommendations: recs, count: recs.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.computeRecommendations = computeRecommendations;
