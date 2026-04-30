import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = (await client.query('SELECT name FROM _migrations')).rows.map(r => r.name);

    const files = readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.includes(file)) {
        console.log(`⏭  Skipping ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(__dirname, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅  Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌  Failed ${file}:`, err.message);
        process.exit(1);
      }
    }
    console.log('✅  All migrations up to date');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
