const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username    TEXT PRIMARY KEY,
        pw          TEXT NOT NULL,
        gold        INTEGER DEFAULT 100,
        chars       JSONB DEFAULT '[]',
        is_admin    BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS custom_items (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        rarity      TEXT NOT NULL,
        item_type   TEXT NOT NULL,
        atk         INTEGER DEFAULT 0,
        def         INTEGER DEFAULT 0,
        val         INTEGER DEFAULT 100,
        pixels      JSONB,
        grid        INTEGER DEFAULT 16,
        created_by  TEXT DEFAULT 'admin',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✅ DB 테이블 초기화 완료')
  } finally {
    client.release()
  }
}

module.exports = { pool, initDB }
