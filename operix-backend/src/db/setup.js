require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

async function setup() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Database schema created successfully');
    // Do NOT call process.exit() — allows chaining with && in start command
  } catch (err) {
    console.error('Failed to set up database:', err.message);
    process.exit(1); // Only exit on real failure
  } finally {
    await db.pool.end(); // Close pool so next process can start fresh
  }
}

setup();
