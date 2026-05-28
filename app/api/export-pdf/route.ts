import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized. Please log in first.', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')
    const mealId = searchParams.get('mealId')

    if (!scanId && !mealId) {
      return new Response('Missing scanId or mealId parameter', { status: 400 })
    }

    let title = 'Clinical Product Report'
    let dataHtml = ''

    if (scanId) {
      const { data: scan, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .eq('user_id', user.id)
        .single()

      if (error || !scan) {
        return new Response('Report not found or permission denied.', { status: 404 })
      }

      const res = scan.result_json
      title = `Report - ${res.product_name || 'Scan'}`

      const additivesRows = Array.isArray(res.additives) && res.additives.length > 0 
        ? res.additives.map((add: any) => `
          <tr>
            <td style="font-weight:bold;">${add.name} ${add.code ? `(${add.code})` : ''}</td>
            <td class="badge risk-${add.risk}">${add.risk.toUpperCase()}</td>
            <td>${add.description}</td>
            <td style="font-size:11px;color:#555;">${add.source || 'Standard Reference'}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="4" style="text-align:center;color:#666;">No chemical additives or E-numbers identified.</td></tr>'

      const ingredientsList = Array.isArray(res.ingredients)
        ? res.ingredients.map((ing: any) => `
          <span class="ing-item status-${ing.status}">
            ${ing.name} ${ing.status !== 'safe' ? `(${ing.status})` : ''}
          </span>
        `).join(', ')
        : 'Not parsed'

      dataHtml = `
        <div class="header-main">
          <h1>CLINICAL INGREDIENTS AUDIT REPORT</h1>
          <p class="subtitle">ScanSafe ULTRA Food Intelligence Analytics</p>
        </div>

        <div class="section-grid">
          <div class="grid-card">
            <h3>Subject Profile</h3>
            <table class="clinical-table-mini">
              <tr><th>Account Email</th><td>${user.email}</td></tr>
              <tr><th>Scan Timestamp</th><td>${new Date(scan.created_at).toLocaleString()}</td></tr>
              <tr><th>FSSAI Jurisdiction</th><td>India (IN)</td></tr>
            </table>
          </div>

          <div class="grid-card">
            <h3>Product Overview</h3>
            <table class="clinical-table-mini">
              <tr><th>Product Name</th><td><strong>${res.product_name}</strong></td></tr>
              <tr><th>Manufacturer / Brand</th><td>${res.brand}</td></tr>
              <tr><th>UPF NOVA Classification</th><td><strong>NOVA Group ${res.upf_score || '4 (Ultra-Processed)'}</strong></td></tr>
            </table>
          </div>
        </div>

        <div class="section-main">
          <div class="score-container">
            <div class="score-circle">
              <span class="score-num">${res.health_score}</span>
              <span class="score-lbl">Score / 100</span>
            </div>
            <div class="score-summary">
              <h3>Diagnostic Summary</h3>
              <p>Safety Evaluation Status: <strong style="text-transform:uppercase;" class="risk-${res.safety_level}">${res.safety_level}</strong></p>
              <p>${res.description}</p>
            </div>
          </div>
        </div>

        <div class="section-main">
          <h3>Full Ingredients Breakdown</h3>
          <div style="line-height:1.6;margin-top:10px;">
            ${ingredientsList}
          </div>
        </div>

        <div class="section-main">
          <h3>Additives & E-Numbers Audit</h3>
          <table class="clinical-table">
            <thead>
              <tr>
                <th>Additive</th>
                <th>Hazard Level</th>
                <th>Risk Evaluation</th>
                <th>Citing Agency</th>
              </tr>
            </thead>
            <tbody>
              ${additivesRows}
            </tbody>
          </table>
        </div>

        <div class="section-grid">
          <div class="grid-card">
            <h3>Toxicological Hazard Summary</h3>
            <table class="clinical-table-mini">
              <tr><th>Microplastics Exposure Risk</th><td class="risk-${res.microplastics_risk || 'medium'}">${(res.microplastics_risk || 'medium').toUpperCase()}</td></tr>
              <tr><th>Packaging Concern Details</th><td>${res.microplastics_reason || 'Polyethylene packaging material assessment.'}</td></tr>
              <tr><th>Soluble Carbon footprint</th><td>${res.sustainability_grade || 'C'} (${res.sustainability_reason || 'Estimated packaging footprint.'})</td></tr>
            </table>
          </div>

          <div class="grid-card">
            <h3>Metabolic Impact</h3>
            <table class="clinical-table-mini">
              <tr><th>Glycemic Index Rating</th><td class="risk-${res.glycemic_index_estimate || 'medium'}">${(res.glycemic_index_estimate || 'medium').toUpperCase()}</td></tr>
              <tr><th>Cardiovascular risk (Heart)</th><td>${res.health_risk_breakdown?.heart || 'low'}</td></tr>
              <tr><th>Diabetes risk (Metabolic)</th><td>${res.health_risk_breakdown?.diabetes || 'low'}</td></tr>
              <tr><th>Gut Inflammatory Index</th><td>${res.health_risk_breakdown?.gut_health || 'low'}</td></tr>
            </table>
          </div>
        </div>
      `
    } else if (mealId) {
      const { data: meal, error } = await supabase
        .from('meal_compositions')
        .select('*')
        .eq('id', mealId)
        .eq('user_id', user.id)
        .single()

      if (error || !meal) {
        return new Response('Meal report not found.', { status: 404 })
      }

      const res = meal.analysis_json
      title = `Meal Report - ${meal.name}`

      const productRows = res.products_scanned.map((p: string) => `<li>${p}</li>`).join('')

      const additivesList = res.additives.length > 0
        ? res.additives.map((a: any) => `<li><strong>${a.name} ${a.code ? `(${a.code})` : ''}</strong> - ${a.description}</li>`).join('')
        : '<li>No chemical additives identified.</li>'

      dataHtml = `
        <div class="header-main">
          <h1>COMPOSITE MEAL CLINICAL REPORT</h1>
          <p class="subtitle">ScanSafe ULTRA Composite Food Analytics</p>
        </div>

        <div class="section-grid">
          <div class="grid-card">
            <h3>Subject Profile</h3>
            <table class="clinical-table-mini">
              <tr><th>Account Email</th><td>${user.email}</td></tr>
              <tr><th>Composite Timestamp</th><td>${new Date(meal.created_at).toLocaleString()}</td></tr>
              <tr><th>FSSAI Jurisdiction</th><td>India (IN)</td></tr>
            </table>
          </div>

          <div class="grid-card">
            <h3>Meal Details</h3>
            <table class="clinical-table-mini">
              <tr><th>Meal Name</th><td><strong>${meal.name}</strong></td></tr>
              <tr><th>Scanned Items Count</th><td>${res.product_count} products</td></tr>
              <tr><th>Combined Health Score</th><td><strong>${res.health_score} / 100</strong></td></tr>
            </table>
          </div>
        </div>

        <div class="section-main">
          <h3>Diagnostic Meal Summary</h3>
          <p style="font-size:15px;line-height:1.6;font-style:italic;color:#333;background:#f5f5f5;padding:15px;border-left:4px solid #10b981;border-radius:4px;">
            "${res.composite_verdict}"
          </p>
        </div>

        <div class="section-main">
          <h3>Composite Nutrition Facts Panel</h3>
          <table class="clinical-table" style="max-width:500px;">
            <thead>
              <tr><th>Nutrient</th><th>Combined Quantity</th></tr>
            </thead>
            <tbody>
              <tr><td>Calories</td><td><strong>${res.nutrition_summary.calories} kcal</strong></td></tr>
              <tr><td>Total Fats</td><td>${res.nutrition_summary.fat}</td></tr>
              <tr><td>Saturated Fats</td><td>${res.nutrition_summary.saturated_fat}</td></tr>
              <tr><td>Total Carbohydrates</td><td>${res.nutrition_summary.carbs}</td></tr>
              <tr><td>Simple Sugars</td><td><strong>${res.nutrition_summary.sugar}</strong></td></tr>
              <tr><td>Dietary Fiber</td><td>${res.nutrition_summary.fiber || '0g'}</td></tr>
              <tr><td>Dietary Proteins</td><td><strong>${res.nutrition_summary.protein}</strong></td></tr>
              <tr><td>Sodium Load</td><td>${res.nutrition_summary.sodium}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section-grid">
          <div class="grid-card">
            <h3>Scanned Food Items</h3>
            <ul>
              ${productRows}
            </ul>
          </div>

          <div class="grid-card">
            <h3>Combined Additive Log</h3>
            <ul style="padding-left:16px;">
              ${additivesList}
            </ul>
          </div>
        </div>
      `
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 40px;
            font-size: 14px;
            line-height: 1.5;
          }
          .no-print-bar {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 12px 24px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
          }
          .print-btn:hover { background: #059669; }
          
          .header-main {
            border-bottom: 3px solid #111;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }
          .header-main h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header-main .subtitle { margin: 4px 0 0 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }

          .section-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .grid-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
          }
          .grid-card h3 { margin: 0 0 12px 0; font-size: 14px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; color: #333; }

          .clinical-table-mini { width: 100%; border-collapse: collapse; }
          .clinical-table-mini th { text-align: left; font-weight: normal; color: #555; font-size: 12px; padding: 4px 0; width: 40%; }
          .clinical-table-mini td { text-align: left; font-size: 13px; padding: 4px 0; }

          .section-main {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
          }
          .section-main h3 { margin: 0 0 14px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }

          .score-container { display: flex; align-items: center; gap: 24px; }
          .score-circle {
            width: 72px; height: 72px; border: 4px solid #111; border-radius: 50%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .score-num { font-size: 24px; font-weight: 950; line-height: 1; }
          .score-lbl { font-size: 9px; color: #555; text-transform: uppercase; }
          .score-summary h3 { margin: 0; border: none; padding: 0; font-size: 16px; }
          .score-summary p { margin: 4px 0 0 0; color: #555; font-size: 13px; }

          .ing-item { font-size: 12px; display: inline-block; background: #f3f4f6; border-radius: 4px; padding: 3px 8px; margin: 2px; border: 1px solid #e5e7eb; }
          .ing-item.status-avoid { background: #fdf2f2; color: #9b1c1c; border-color: #fde8e8; }
          .ing-item.status-caution { background: #fffbeb; color: #92400e; border-color: #fef3c7; }

          .clinical-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .clinical-table th { background: #f9fafb; text-align: left; padding: 10px; font-size: 12px; border-bottom: 2px solid #ddd; }
          .clinical-table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }

          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          
          .risk-danger, .risk-high { color: #b91c1c; background: #fee2e2; }
          .risk-moderate, .risk-medium { color: #b45309; background: #fef3c7; }
          .risk-safe, .risk-low { color: #15803d; background: #dcfce7; }

          @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0; font-size: 12px; }
            .section-grid { gap: 10px; margin-bottom: 12px; }
            .section-main { padding: 12px; margin-bottom: 12px; }
            .grid-card { padding: 10px; }
            .clinical-table td, .clinical-table th { padding: 6px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong>Report Generated Successfully</strong>
            <span style="color:#666;font-size:12px;display:block;">Print this page directly or save as PDF via your browser.</span>
          </div>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>

        ${dataHtml}
      </body>
      </html>
    `

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  } catch (error: any) {
    console.error('Error generating PDF report:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
