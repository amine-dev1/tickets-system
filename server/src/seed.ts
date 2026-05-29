import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
  });
  await client.connect();
  
  // 1. Drop the restrictive constraint
  await client.query(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_role_company;`);
  
  // 2. Fix the trigger function to use user_metadata
  await client.query(`
    CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, role, company_id)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
        COALESCE(NEW.raw_user_meta_data->>'role', 'client'), 
        NULLIF(NEW.raw_user_meta_data->>'company_id', '')::uuid
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  
  await client.end();
  console.log('Database schema fixed.');
}

async function clearData() {
  console.log('Clearing old data...');
  
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  
  // Use TRUNCATE for safety and speed
  await client.query('TRUNCATE TABLE ticket_history, ticket_attachments, ticket_comments, tickets CASCADE;');
  await client.query('TRUNCATE TABLE missions CASCADE;');
  await client.query('TRUNCATE TABLE prestataires CASCADE;');
  await client.query('TRUNCATE TABLE profiles CASCADE;');
  await client.query('TRUNCATE TABLE companies CASCADE;');
  
  await client.end();

  // Clear auth.users
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  
  for (const user of users.users) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
  
  console.log('Data cleared.');
}

async function createUser(email: string, password: string, name: string, role: string, companyId?: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role: role,
      company_id: companyId || null
    }
  });
  if (error) throw error;
  
  console.log(`User created: ${email} (${role})`);
  return data.user;
}

async function seed() {
  try {
    await fixDatabase();
    await clearData();
    
    console.log('Seeding new data...');
    // Superadmin
    await createUser('elidrissiamine74@gmail.com', 'elidrissi2002', 'Amine El Idrissi', 'superadmin');
    
    // Enterprise
    const { data: company, error: compError } = await supabaseAdmin.from('companies').insert({
      name: 'jonytravel',
      slug: 'jonytravel'
    }).select().single();
    if (compError) throw compError;
    
    console.log(`Enterprise created: jonytravel`);
    
    // Admin
    await createUser('admin@gmail.com', 'elidrissi2002', 'Admin User', 'admin', company.id);
    
    // Agent
    await createUser('agent@gmail.com', 'elidrissi2002', 'Agent User', 'agent', company.id);
    
    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
