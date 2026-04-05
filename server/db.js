const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        department VARCHAR(150) DEFAULT '',
        avatar_color VARCHAR(10) DEFAULT '#d32f2f',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        owner_phone VARCHAR(20) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        UNIQUE(owner_phone, contact_phone)
      );
    `);
    console.log('✅ PostgreSQL tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
