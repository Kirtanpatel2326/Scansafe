const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gpfiudwvlxotysmlzaew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZml1ZHd2bHhvdHlzbWx6YWV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY5NzE2MSwiZXhwIjoyMDk0MjczMTYxfQ.zdjAYcMOlBg8wIR6nd17hYwSZf669IVAZG7wuuFqS0I'
)

async function inspect() {
  const { data, error } = await supabase.from('scans').select('*').limit(1)
  if (error) {
    console.error("Error fetching scans:", error)
  } else {
    console.log("Scans table columns:", Object.keys(data[0] || {}))
    console.log("Sample result_json keys:", Object.keys(data[0]?.result_json || {}))
  }
}
inspect()
