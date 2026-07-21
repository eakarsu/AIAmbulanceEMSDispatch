'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../server/db').pool;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('governed_dispatch_migrations'))");
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const directory = path.join(__dirname, 'migrations');
    for (const name of fs.readdirSync(directory).filter((file) => file.endsWith('.sql')).sort()) {
      const sql = fs.readFileSync(path.join(directory, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const prior = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
      if (prior.rows[0]?.checksum && prior.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      if (prior.rows[0]) continue;
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1,$2)', [name, checksum]);
      console.log(`Applied ${name}`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('governed_dispatch_migrations'))").catch(() => {});
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

