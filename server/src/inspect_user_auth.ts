import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: authUsers, error: aError } = await supabase.auth.admin.listUsers();
  if (aError) {
    console.error("Error:", aError);
  } else {
    console.log("All Auth Users:");
    authUsers.users.forEach((u: any) => {
      console.log(`- ${u.email}: ID=${u.id}, Confirmed=${u.email_confirmed_at || u.confirmed_at || 'NO'}, VerifiedMetadata=${u.user_metadata?.email_verified}`);
    });
  }
}

check();
