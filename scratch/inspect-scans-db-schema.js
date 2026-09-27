const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gpfiudwvlxotysmlzaew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZml1ZHd2bHhvdHlzbWx6YWV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY5NzE2MSwiZXhwIjoyMDk0MjczMTYxfQ.zdjAYcMOlBg8wIR6nd17hYwSZf669IVAZG7wuuFqS0I'
)

async function inspect() {
  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'scans' })
  if (error) {
    // If RPC doesn't exist, select * and inspect the fields of a few rows
    console.log("RPC failed, selecting rows...")
    const { data: rows, error: selectError } = await supabase.from('scans').select('*').limit(5)
    if (selectError) {
      console.error("Select failed:", selectError)
    } else {
      console.log("Rows returned:", rows.length)
      if (rows.length > 0) {
        console.log("Keys of row 0:", Object.keys(rows[0]))
        console.log("Row 0 result_json keys:", Object.keys(rows[0].result_json || {}))
        console.log("Row 0 result_json content:", JSON.stringify(rows[0].result_json, null, 2).slice(0, 500))
      }
    }
  } else {
    console.log("inspect_table_columns data:", data)
  }
}
inspect()
