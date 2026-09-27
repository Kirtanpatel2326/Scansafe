const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gpfiudwvlxotysmlzaew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZml1ZHd2bHhvdHlzbWx6YWV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY5NzE2MSwiZXhwIjoyMDk0MjczMTYxfQ.zdjAYcMOlBg8wIR6nd17hYwSZf669IVAZG7wuuFqS0I'
)

async function inspect() {
  const { data, error } = await supabase.from('scans').select('*').order('created_at', { ascending: false }).limit(20)
  if (error) {
    console.error("Error fetching scans:", error)
  } else {
    data.forEach((row, i) => {
      console.log(`Row ${i} columns:`, Object.keys(row))
      console.log(`Row ${i} result_json keys:`, Object.keys(row.result_json || {}))
      if (row.result_json && (row.result_json.image || row.result_json.image_url || row.result_json.imageUrl)) {
        console.log(`Row ${i} HAS IMAGE! Key name:`, row.result_json.image ? 'image' : (row.result_json.image_url ? 'image_url' : 'imageUrl'))
      }
    })
  }
}
inspect()
