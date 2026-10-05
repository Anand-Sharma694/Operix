const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// Compute risks from data
async function computeRisks(bizId) {
  const risks = [];

  // Get inventory + sales data for all products
  const result = await db.query(
    `SELECT p.id, p.name, p.current_stock, p.reorder_level,
       COALESCE(s30.avg_daily, 0) as avg_daily_30d,
       COALESCE(s30.total, 0) as total_30d,
       COALESCE(s7.avg_daily, 0) as avg_daily_7d,
       COALESCE(s7.total, 0) as total_7d,
       COALESCE(sprev.avg_daily, 0) as avg_daily_prev30d
     FROM products p
     LEFT JOIN (
       SELECT product_id, SUM(quantity)::float/30 as avg_daily, SUM(quantity) as total
       FROM sales WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY product_id
     ) s30 ON s30.product_id = p.id
     LEFT JOIN (
       SELECT product_id, SUM(quantity)::float/7 as avg_daily, SUM(quantity) as total
       FROM sales WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY product_id
     ) s7 ON s7.product_id = p.id
     LEFT JOIN (
       SELECT product_id, SUM(quantity)::float/30 as avg_daily
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
    const avgDaily7d = parseFloat(p.avg_daily_7d) || 0;
    const avgDailyPrev = parseFloat(p.avg_daily_prev30d) || 0;
    const stock = parseInt(p.current_stock) || 0;
    const reorderLevel = parseInt(p.reorder_level) || 10;

    // Stockout risk
    if (avgDaily > 0) {
      const daysRemaining = stock / avgDaily;
      if (daysRemaining < 7 && stock > 0) {
        const severity = daysRemaining < 3 ? 'high' : 'medium';
        risks.push({
          product_id: p.id,
          product_name: p.name,
          risk_type: 'stockout',
          severity,
          title: `${p.name} may run out soon`,
          reason: `Current stock (${stock} units) at current sales rate of ${Math.round(avgDaily * 10) / 10} units/day will last approximately ${Math.round(daysRemaining)} day(s).`,
          recommended_action: `Consider ordering approximately ${Math.ceil(avgDaily * 30)} units to cover the next 30 days.`,
        });
      } else if (stock === 0) {
        risks.push({
          product_id: p.id,
          product_name: p.name,
          risk_type: 'stockout',
          severity: 'high',
          title: `${p.name} is out of stock`,
          reason: `This product has zero inventory while showing recent sales activity.`,
          recommended_action: `Replenish stock immediately. Suggested quantity: ${Math.ceil(avgDaily * 30)} units.`,
        });
      }
    }

    // Overstock risk
    if (avgDaily > 0 && stock > avgDaily * 60) {
      risks.push({
        product_id: p.id,
        product_name: p.name,
        risk_type: 'overstock',
        severity: 'medium',
        title: `${p.name} has excess inventory`,
        reason: `Current stock (${stock} units) represents ${Math.round(stock / avgDaily)} days of supply, which is above the recommended 60-day threshold.`,
        recommended_action: `Consider reducing future orders or running promotions to move excess inventory.`,
      });
    }

    // Sales decline
    if (avgDailyPrev > 0 && avgDaily < avgDailyPrev * 0.7) {
      const declinePct = Math.round(((avgDailyPrev - avgDaily) / avgDailyPrev) * 100);
      risks.push({
        product_id: p.id,
        product_name: p.name,
        risk_type: 'decline',
        severity: declinePct > 50 ? 'high' : 'medium',
        title: `${p.name} sales are declining`,
        reason: `Sales decreased by ${declinePct}% compared to the previous 30-day period (from ${Math.round(avgDailyPrev * 10) / 10} to ${Math.round(avgDaily * 10) / 10} units/day).`,
        recommended_action: `Review pricing, marketing spend, or competitor activity for this product.`,
      });
    }

    // Demand surge (unusual pattern)
    if (avgDailyPrev > 0 && avgDaily7d > avgDailyPrev * 1.8) {
      risks.push({
        product_id: p.id,
        product_name: p.name,
        risk_type: 'demand_change',
        severity: 'medium',
        title: `${p.name} demand is spiking`,
        reason: `Recent 7-day average sales (${Math.round(avgDaily7d * 10) / 10} units/day) are significantly higher than the historical baseline (${Math.round(avgDailyPrev * 10) / 10} units/day).`,
        recommended_action: `Monitor inventory closely and consider an early reorder to meet increased demand.`,
      });
    }
  }

  return risks;
}

// GET /api/risks
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const risks = await computeRisks(biz.id);

    // Save/refresh risks in DB
    await db.query('DELETE FROM risks WHERE business_id = $1 AND is_resolved = FALSE', [biz.id]);
    for (const risk of risks) {
      await db.query(
        `INSERT INTO risks (business_id, product_id, risk_type, severity, title, reason, recommended_action, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [biz.id, risk.product_id, risk.risk_type, risk.severity, risk.title, risk.reason, risk.recommended_action, JSON.stringify({})]
      );
    }

    res.json({ risks, count: risks.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.computeRisks = computeRisks;
