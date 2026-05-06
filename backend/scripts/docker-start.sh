#!/bin/sh
# Container startup: migrate (idempotent) → seed if empty → start server.
# Used as Dockerfile CMD so `docker compose up` is fully self-contained.
set -e

echo '📦 Running migrations...'
node migrations/run.js

USER_COUNT=$(node -e "
import('./src/config/db.js').then(async ({default: pool}) => {
  try {
    const r = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    console.log(r.rows[0].n);
  } catch (_) { console.log(0); }
  process.exit(0);
}).catch(() => { console.log(0); process.exit(0); });
")

if [ "$USER_COUNT" = "0" ]; then
  echo '🌱 Empty DB — seeding sample data (admin + 2 users + sample events)...'
  node scripts/seed.js
else
  echo "✅ DB has $USER_COUNT users — skipping seed"
fi

echo '🚀 Starting server...'
exec node src/server.js
