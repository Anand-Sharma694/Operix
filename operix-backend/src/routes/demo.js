const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const DEMO_PRODUCTS = [
  { name: 'Wireless Headphones', sku: 'WH-001', category: 'Audio', unit_price: 79.99, current_stock: 25, reorder_level: 20 },
  { name: 'Bluetooth Speaker', sku: 'BS-002', category: 'Audio', unit_price: 49.99, current_stock: 60, reorder_level: 15 },
  { name: 'Smart Watch', sku: 'SW-003', category: 'Wearables', unit_price: 199.99, current_stock: 18, reorder_level: 10 },
  { name: 'USB-C Cable', sku: 'UC-004', category: 'Accessories', unit_price: 12.99, current_stock: 200, reorder_level: 50 },
  { name: 'Power Bank', sku: 'PB-005', category: 'Power', unit_price: 34.99, current_stock: 45, reorder_level: 20 },
  { name: 'Keyboard', sku: 'KB-006', category: 'Peripherals', unit_price: 59.99, current_stock: 120, reorder_level: 15 },
  { name: 'Mouse', sku: 'MO-007', category: 'Peripherals', unit_price: 29.99, current_stock: 85, reorder_level: 20 },
  { name: 'Laptop Stand', sku: 'LS-008', category: 'Accessories', unit_price: 39.99, current_stock: 35, reorder_level: 10 },
  { name: 'Webcam', sku: 'WC-009', category: 'Video', unit_price: 69.99, current_stock: 12, reorder_level: 8 },
  { name: 'Earbuds', sku: 'EB-010', category: 'Audio', unit_price: 54.99, current_stock: 8, reorder_level: 15 },
];

// Sales patterns per product (avg daily units, variance, trend)
const SALES_PATTERNS = {
  'Wireless Headphones': { avg: 6, variance: 2, trend: 0.05 },    // trending up → stockout risk
  'Bluetooth Speaker':   { avg: 4, variance: 1.5, trend: -0.02 }, // slight decline
  'Smart Watch':         { avg: 2, variance: 1, trend: 0.03 },
  'USB-C Cable':         { avg: 12, variance: 3, trend: 0 },       // stable, overstock
  'Power Bank':          { avg: 3, variance: 1, trend: -0.04 },    // declining → risk
  'Keyboard':            { avg: 2.5, variance: 1, trend: 0 },      // overstock
  'Mouse':               { avg: 3, variance: 1.5, trend: 0.01 },
  'Laptop Stand':        { avg: 1.5, variance: 0.8, trend: -0.05 }, // declining
  'Webcam':              { avg: 1.2, variance: 0.5, trend: 0.08 },  // spike → demand change
  'Earbuds':             { avg: 4, variance: 1.5, trend: 0.06 },    // high demand + low stock
};

function randomNormal(mean, stdDev) {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// POST /api/demo/seed
router.post('/seed', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if business exists
    const bizResult = await client.query('SELECT * FROM businesses WHERE user_id = $1', [req.user.id]);
    let biz = bizResult.rows[0];

    if (!biz) {
      const newBiz = await client.query(
        'INSERT INTO businesses (user_id, name, type, category, is_demo) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
        [req.user.id, 'Demo Electronics Store', 'retail', 'electronics']
      );
      biz = newBiz.rows[0];
    } else {
      // Mark as demo and clear old data
      await client.query('UPDATE businesses SET is_demo = TRUE WHERE id = $1', [biz.id]);
      await client.query('DELETE FROM sales WHERE business_id = $1', [biz.id]);
      await client.query('DELETE FROM products WHERE business_id = $1', [biz.id]);
      await client.query('DELETE FROM risks WHERE business_id = $1', [biz.id]);
      await client.query('DELETE FROM recommendations WHERE business_id = $1', [biz.id]);
    }

    // Insert products
    const productIds = {};
    for (const prod of DEMO_PRODUCTS) {
      const r = await client.query(
        'INSERT INTO products (business_id, name, sku, category, unit_price, current_stock, reorder_level) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [biz.id, prod.name, prod.sku, prod.category, prod.unit_price, prod.current_stock, prod.reorder_level]
      );
      productIds[prod.name] = r.rows[0].id;
    }

    // Generate 180 days of sales data
    const today = new Date();
    const salesValues = [];

    for (const prod of DEMO_PRODUCTS) {
      const pattern = SALES_PATTERNS[prod.name] || { avg: 3, variance: 1, trend: 0 };

      for (let dayOffset = 180; dayOffset >= 0; dayOffset--) {
        const saleDate = new Date(today);
        saleDate.setDate(saleDate.getDate() - dayOffset);
        const dayProgress = (180 - dayOffset) / 180; // 0 to 1

        const trendedAvg = pattern.avg * (1 + pattern.trend * dayProgress * 10);
        const dailyQty = Math.max(0, Math.round(randomNormal(trendedAvg, pattern.variance)));

        if (dailyQty > 0) {
          // Some days have no sales (realistic)
          const sellProb = 0.85;
          if (Math.random() < sellProb) {
            const datStr = saleDate.toISOString().split('T')[0];
            salesValues.push(`('${biz.id}', '${productIds[prod.name]}', '${datStr}', ${dailyQty}, ${prod.unit_price})`);
          }
        }
      }
    }

    // Batch insert sales
    if (salesValues.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < salesValues.length; i += chunkSize) {
        const chunk = salesValues.slice(i, i + chunkSize);
        await client.query(
          `INSERT INTO sales (business_id, product_id, sale_date, quantity, unit_price) VALUES ${chunk.join(',')}`
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Demo data loaded successfully',
      business: biz,
      products_seeded: DEMO_PRODUCTS.length,
      sales_records: salesValues.length,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/demo/clear
router.delete('/clear', async (req, res, next) => {
  try {
    const biz = await db.query('SELECT id FROM businesses WHERE user_id = $1', [req.user.id]);
    if (!biz.rows[0]) return res.status(404).json({ error: 'Business not found' });
    const bizId = biz.rows[0].id;
    await db.query('DELETE FROM sales WHERE business_id = $1', [bizId]);
    await db.query('DELETE FROM products WHERE business_id = $1', [bizId]);
    await db.query('DELETE FROM risks WHERE business_id = $1', [bizId]);
    await db.query('DELETE FROM recommendations WHERE business_id = $1', [bizId]);
    await db.query('UPDATE businesses SET is_demo = FALSE WHERE id = $1', [bizId]);
    res.json({ message: 'Demo data cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
