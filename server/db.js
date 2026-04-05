const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function initDB() {
  if (!pool) {
    console.log('⚠️  No DATABASE_URL — skipping DB init');
    return;
  }
  let client;
  try {
    client = await pool.connect();
    
    // Users table
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
    
    // Contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        owner_phone VARCHAR(20) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        UNIQUE(owner_phone, contact_phone)
      );
    `);
    
    // Messages table — stores ALL chat messages (group + DM)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room VARCHAR(100) NOT NULL,
        sender_phone VARCHAR(20) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,
        msg_type VARCHAR(20) DEFAULT 'text',
        content TEXT DEFAULT '',
        image TEXT DEFAULT '',
        lat DOUBLE PRECISION DEFAULT 0,
        lng DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Index on room for fast history lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room, created_at);
    `);
    
    console.log('✅ PostgreSQL tables ready (users, contacts, messages)');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, initDB };
