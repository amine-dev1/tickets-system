const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260522000000_role_hierarchy.sql'),
  'utf-8'
);

const client = new Client({
  connectionString:
    'postgresql://postgres.wclgjohqslmihkfvwxaj:elidrissi2002@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
});

(async () => {
  try {
    await client.connect();
    console.log('Connected. Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully');

    const r = await client.query(
      'SELECT email, full_name, role, company_id FROM profiles ORDER BY role, email'
    );
    console.table(r.rows);
  } catch (e) {
    console.error('Error:', e.message);
    if (e.position) console.error('Position:', e.position);
  } finally {
    await client.end();
  }
})();
