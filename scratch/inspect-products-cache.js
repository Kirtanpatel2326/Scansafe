const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gpfiudwvlxotysmlzaew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZml1ZHd2bHhvdHlzbWx6YWV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY5NzE2MSwiZXhwIjoyMDk0MjczMTYxfQ.zdjAYcMOlBg8wIR6nd17hYwSZf669IVAZG7wuuFqS0I'
)

async function inspect() {
  const { data, error } = await supabase.from('product_cache').select('*').limit(5)
  if (error) {
    console.error("Error fetching cache:", error)
  } else {
    data.forEach((row, i) => {
      console.log(`Cache Row ${i} keys:`, Object.keys(row))
      console.log(`Cache Row ${i} raw_data keys:`, Object.keys(row.raw_data || {}))
      if (row.raw_data && (row.raw_data.image || row.raw_data.image_url || row.raw_data.imageUrl)) {
        console.log(`Cache Row ${i} HAS IMAGE!`)
      }
    })
  }
}
inspect()
