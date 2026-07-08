import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function upgradeFounder() {
  const email = 'kirtanpatel2326@gmail.com';
  console.log(`Looking up user by email: ${email}`);
  
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found! Please make sure you have signed up first.`);
    return;
  }
  
  console.log(`Found user: ${user.id}`);
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      scan_credits: 999999,
      plan: 'pro',
      plan_type: 'founder_unlimited'
    })
    .eq('id', user.id)
    .select();
    
  if (error) {
    console.error("Error updating profile:", error);
  } else {
    console.log("Successfully upgraded founder account to UNLIMITED scans!", data);
  }
}

upgradeFounder();
