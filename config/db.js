const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon
});

// ✅ FIX 1: Handle idle client errors — prevents Node from crashing
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
});

// ✅ FIX 2: Release the client after the connection test
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL (Neon)');
    release(); // 👈 This was missing — returns client back to the pool
  }
});

module.exports = pool;