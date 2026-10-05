require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

async function setup() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Database schema created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to set up database:', err.message);
    process.exit(1);
  }
}

setup();
