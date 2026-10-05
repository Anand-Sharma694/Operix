const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

// Linear regression helper
function linearRegression(y) {
  const n = y.length;
  if (n < 2) return null;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, n };
}

function predictDemand(salesData, horizonDays) {
  if (!salesData || salesData.length < 7) {
    return { insufficient_data: true, min_required: 7, available: salesData ? salesData.length : 0 };
  }

  // Aggregate by day
  const dailyMap = {};
  salesData.forEach(s => {
    const d = s.sale_date.toISOString ? s.sale_date.toISOString().split('T')[0] : s.sale_date;
    dailyMap[d] = (dailyMap[d] || 0) + parseFloat(s.quantity);
  });
  const days = Object.keys(dailyMap).sort();
  const quantities = days.map(d => dailyMap[d]);

  const reg = linearRegression(quantities);
  if (!reg) return { insufficient_data: true, min_required: 7, available: days.length };

  const avgDaily = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  const predictedTotal = Math.max(0, Math.round((avgDaily + reg.slope * horizonDays / 2) * horizonDays));

  // Compute confidence: if std dev is low relative to mean → high confidence
  const mean = avgDaily;
  const variance = quantities.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / quantities.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 1;
  const confidence = cv < 0.3 ? 'high' : cv < 0.6 ? 'medium' : 'low';

  return {
    predicted_total: predictedTotal,
    avg_daily: Math.round(avgDaily * 10) / 10,
    trend: reg.slope > 0.1 ? 'increasing' : reg.slope < -0.1 ? 'decreasing' : 'stable',
    confidence,
    data_points: days.length,
    model: 'linear_regression',
    historical_avg_daily: Math.round(avgDaily * 10) / 10,
  };
}

// GET /api/forecast?days=7|30|90&product_id=...
router.get('/', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const horizon = parseInt(req.query.days) || 30;
    const productId = req.query.product_id;

    // Get products
    let productsQ;
    if (productId) {
      productsQ = await db.query('SELECT id, name FROM products WHERE id = $1 AND business_id = $2', [productId, biz.id]);
    } else {
      productsQ = await db.query('SELECT id, name FROM products WHERE business_id = $1 AND is_active = TRUE ORDER BY name', [biz.id]);
    }

    const forecasts = [];
    for (const product of productsQ.rows) {
      // Get last 90 days of sales for this product
      const salesQ = await db.query(
        `SELECT sale_date, SUM(quantity) as quantity
         FROM sales WHERE product_id = $1 AND business_id = $2 AND sale_date >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY sale_date ORDER BY sale_date ASC`,
        [product.id, biz.id]
      );

      const forecast = predictDemand(salesQ.rows, horizon);
      forecasts.push({ product_id: product.id, product_name: product.name, horizon_days: horizon, ...forecast });
    }

    res.json({ forecasts });
  } catch (err) {
    next(err);
  }
});

// GET /api/forecast/chart/:productId?days=30
router.get('/chart/:productId', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const productId = req.params.productId;
    const horizon = parseInt(req.query.days) || 30;

    const productQ = await db.query('SELECT id, name FROM products WHERE id = $1 AND business_id = $2', [productId, biz.id]);
    if (productQ.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    // Historical daily sales
    const salesQ = await db.query(
      `SELECT sale_date, SUM(quantity) as quantity
       FROM sales WHERE product_id = $1 AND business_id = $2 AND sale_date >= CURRENT_DATE - INTERVAL '90 days'
       GROUP BY sale_date ORDER BY sale_date ASC`,
      [productId, biz.id]
    );

    const historical = salesQ.rows.map(r => ({
      date: r.sale_date,
      quantity: parseFloat(r.quantity),
    }));

    if (historical.length < 7) {
      return res.json({
        product: productQ.rows[0],
        historical,
        forecast: [],
        insufficient_data: true,
        message: `Need at least 7 days of data. Currently have ${historical.length} days.`,
      });
    }

    const reg = linearRegression(historical.map(h => h.quantity));
    const avgDaily = historical.reduce((a, h) => a + h.quantity, 0) / historical.length;

    // Build forecast points
    const forecast = [];
    for (let i = 1; i <= horizon; i++) {
      const projected = Math.max(0, (reg.intercept + reg.slope * (historical.length + i)));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      forecast.push({
        date: futureDate.toISOString().split('T')[0],
        quantity: Math.round(projected * 10) / 10,
        type: 'forecast',
      });
    }

    res.json({
      product: productQ.rows[0],
      historical,
      forecast,
      avg_daily: Math.round(avgDaily * 10) / 10,
      trend: reg.slope > 0.1 ? 'increasing' : reg.slope < -0.1 ? 'decreasing' : 'stable',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
