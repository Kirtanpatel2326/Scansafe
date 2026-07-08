const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fix() {
  const { data, error } = await supabaseAdmin.from('profiles').select('id, email, scan_credits').order('created_at', { ascending: false }).limit(10)
  if (error) {
    console.error(error)
    return
  }
  console.log("Recent profiles:", data)

  // Find the one with 1200+ scans and fix it to 10.
  const user = data.find(u => u.scan_credits >= 1200)
  if (user) {
    const correctCredits = user.scan_credits - 1200 + 10;
    const { error: updateError } = await supabaseAdmin.from('profiles').update({ scan_credits: correctCredits }).eq('id', user.id)
    if (updateError) {
      console.error("Error updating user:", updateError)
    } else {
      console.log(`Successfully fixed user ${user.email} (ID: ${user.id}). Credits updated from ${user.scan_credits} to ${correctCredits}.`)
    }
  } else {
    console.log("No user found with 1200 scans.")
  }
}
fix()
