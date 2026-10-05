const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Multer setup
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are allowed'));
  },
});

async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

function parseExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// POST /api/data/upload - upload and preview file
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows;
    if (ext === '.csv') {
      rows = await parseCsvFile(req.file.path);
    } else {
      rows = parseExcelFile(req.file.path);
    }

    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File is empty' });
    }

    const columns = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);

    res.json({
      file_id: req.file.filename,
      columns,
      preview,
      total_rows: rows.length,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// POST /api/data/import - import with column mapping
router.post('/import', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const { file_id, mapping } = req.body;
    // mapping: { product_name: 'col', date: 'col', quantity: 'col', unit_price: 'col', stock: 'col' }
    if (!file_id || !mapping) {
      return res.status(400).json({ error: 'file_id and mapping are required' });
    }

    const required = ['product_name', 'date', 'quantity'];
    for (const field of required) {
      if (!mapping[field]) return res.status(400).json({ error: `Column mapping for '${field}' is required` });
    }

    const filePath = path.join(uploadDir, file_id);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found. Please re-upload.' });
    }

    const ext = path.extname(file_id).split('-').pop();
    let rows;
    if (file_id.endsWith('.csv')) {
      rows = await parseCsvFile(filePath);
    } else {
      rows = parseExcelFile(filePath);
    }

    const errors = [];
    const validRows = [];
    const productCache = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      const productName = String(row[mapping.product_name] || '').trim();
      const dateStr = String(row[mapping.date] || '').trim();
      const qtyStr = String(row[mapping.quantity] || '').trim();
      const priceStr = mapping.unit_price ? String(row[mapping.unit_price] || '').trim() : '';
      const stockStr = mapping.stock ? String(row[mapping.stock] || '').trim() : '';

      if (!productName) { errors.push({ line: lineNum, error: 'Missing product name' }); continue; }

      const saleDate = new Date(dateStr);
      if (isNaN(saleDate.getTime())) { errors.push({ line: lineNum, error: `Invalid date: ${dateStr}` }); continue; }

      const qty = parseInt(qtyStr);
      if (isNaN(qty) || qty <= 0) { errors.push({ line: lineNum, error: `Invalid quantity: ${qtyStr}` }); continue; }

      const unitPrice = priceStr ? parseFloat(priceStr) : 0;
      const stock = stockStr ? parseInt(stockStr) : null;

      validRows.push({ productName, saleDate: saleDate.toISOString().split('T')[0], qty, unitPrice, stock });
    }

    if (validRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No valid rows found', validation_errors: errors.slice(0, 20) });
    }

    // Import valid rows
    const client = await db.getClient();
    let imported = 0;
    try {
      await client.query('BEGIN');

      for (const row of validRows) {
        // Get or create product
        if (!productCache[row.productName]) {
          let prodResult = await client.query(
            'SELECT id FROM products WHERE business_id = $1 AND name = $2',
            [biz.id, row.productName]
          );
          if (prodResult.rows.length === 0) {
            prodResult = await client.query(
              'INSERT INTO products (business_id, name, unit_price, current_stock) VALUES ($1, $2, $3, $4) RETURNING id',
              [biz.id, row.productName, row.unitPrice || 0, row.stock || 0]
            );
          } else if (row.stock !== null) {
            await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [row.stock, prodResult.rows[0].id]);
          }
          productCache[row.productName] = prodResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO sales (business_id, product_id, sale_date, quantity, unit_price) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
          [biz.id, productCache[row.productName], row.saleDate, row.qty, row.unitPrice || 1]
        );
        imported++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    fs.unlinkSync(filePath);

    res.json({
      message: `Successfully imported ${imported} records.`,
      imported,
      skipped: rows.length - validRows.length,
      validation_errors: errors.slice(0, 20),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
