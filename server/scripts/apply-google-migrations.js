// One-off: apply the Google Calendar migrations to Supabase (idempotent).
// Usage: node scripts/apply-google-migrations.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS = [
  '20260602000000_google_calendar.sql',
  '20260603000000_google_calendar_toggle.sql',
];

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set in server/.env');
  process.exit(1);
}

const client = new Client({ connectionString });

(async () => {
  try {
    await client.connect();
    for (const file of MIGRATIONS) {
      const sql = fs.readFileSync(
        path.join(__dirname, '..', '..', 'supabase', 'migrations', file),
        'utf-8',
      );
      process.stdout.write(`Applying ${file} ... `);
      await client.query(sql);
      console.log('OK');
    }
    const r = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('google_calendar_connections','google_calendar_event_map') ORDER BY table_name",
    );
    console.log('Tables present:', r.rows.map((x) => x.table_name).join(', ') || '(none)');
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
