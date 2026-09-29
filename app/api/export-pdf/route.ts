import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { escapeHtml } from '@/lib/html'

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

      const res = scan.result_json || {}
      const isComparison = scan.barcode?.startsWith('COMPARE:')

      if (isComparison) {
        const prodAName = escapeHtml(res.product_a?.name || 'Product A')
        const prodABrand = escapeHtml(res.product_a?.brand || 'Brand A')
        const prodBName = escapeHtml(res.product_b?.name || 'Product B')
        const prodBBrand = escapeHtml(res.product_b?.brand || 'Brand B')

        title = `Comparison Report - ${prodABrand} vs ${prodBBrand}`

        const tableEntries = Object.entries(res.comparison_table || {})
          .filter(([field]) => field !== 'basis')

        const tableRows = tableEntries.length > 0
          ? tableEntries.map(([field, values]: any) => `
            <tr>
              <td style="font-weight:bold;text-transform:capitalize;">${escapeHtml(field.replace(/_/g, ' '))}</td>
              <td>${escapeHtml(values?.a ?? 'N/A')}</td>
              <td>${escapeHtml(values?.b ?? 'N/A')}</td>
            </tr>
          `).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#666;">No nutrition comparison data available.</td></tr>'

        const highlightsA = Array.isArray(res.product_a?.highlights)
          ? res.product_a.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')
          : ''
        const highlightsB = Array.isArray(res.product_b?.highlights)
          ? res.product_b.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')
          : ''

        const winnerLabel = res.winner === 'tie'
          ? 'Healthy Tie'
          : res.winner === 'undetermined'
          ? 'Inconclusive / Undetermined'
          : res.winner === 'A'
          ? `Product A (${prodABrand})`
          : `Product B (${prodBBrand})`

        const scoreA = res.product_a?.health_score != null ? `${res.product_a.health_score} / 100` : 'Unrated'
        const scoreB = res.product_b?.health_score != null ? `${res.product_b.health_score} / 100` : 'Unrated'
        const safetyA = escapeHtml(res.product_a?.safety_level || 'insufficient_evidence')
        const safetyB = escapeHtml(res.product_b?.safety_level || 'insufficient_evidence')

        dataHtml = `
          <div class="header-main">
            <h1>CLINICAL SIDE-BY-SIDE COMPARISON REPORT</h1>
            <p class="subtitle">ScanSafe ULTRA Food Intelligence Analytics</p>
          </div>

          <div class="section-grid">
            <div class="grid-card">
              <h3>Subject Profile</h3>
              <table class="clinical-table-mini">
                <tr><th>Account Email</th><td>${escapeHtml(user.email)}</td></tr>
                <tr><th>Scan Timestamp</th><td>${escapeHtml(new Date(scan.created_at).toLocaleString())}</td></tr>
                <tr><th>Regional Context</th><td>India (IN)</td></tr>
              </table>
            </div>

            <div class="grid-card">
              <h3>Winner Evaluation</h3>
              <table class="clinical-table-mini">
                <tr><th>Evaluated Choice</th><td><strong>Product A vs Product B</strong></td></tr>
                <tr><th>Winner Selected</th><td><strong>${winnerLabel}</strong></td></tr>
                <tr><th>Verdict Title</th><td>${res.winner === 'A' ? `${prodABrand} ${prodAName}` : res.winner === 'B' ? `${prodBBrand} ${prodBName}` : res.winner === 'tie' ? 'Equal Nutritional Quality' : 'Insufficient Evidence'}</td></tr>
              </table>
            </div>
          </div>

          <div class="section-main">
            <h3>Comparison Rationale</h3>
            <p style="font-size:13px;line-height:1.6;color:#222;font-weight:500;">${escapeHtml(res.winner_reason || 'No detailed rationale available.')}</p>
          </div>

          <div class="section-grid">
            <div class="grid-card">
              <h3 class="risk-${safetyA}">Product A - ${prodABrand}</h3>
              <p style="font-size:12px;margin:4px 0 10px 0;color:#666;">${prodAName}</p>
              <table class="clinical-table-mini" style="margin-bottom:12px;">
                <tr><th>Health Score</th><td><strong>${scoreA}</strong></td></tr>
                <tr><th>Safety Level</th><td style="text-transform:uppercase;" class="risk-${safetyA}"><strong>${safetyA}</strong></td></tr>
              </table>
              ${highlightsA ? `
                <h4 style="font-size:11px;text-transform:uppercase;color:#555;margin-bottom:6px;">Safety Highlights</h4>
                <ul style="font-size:12px;padding-left:16px;margin:0;line-height:1.5;color:#444;">
                  ${highlightsA}
                </ul>
              ` : ''}
            </div>

            <div class="grid-card">
              <h3 class="risk-${safetyB}">Product B - ${prodBBrand}</h3>
              <p style="font-size:12px;margin:4px 0 10px 0;color:#666;">${prodBName}</p>
              <table class="clinical-table-mini" style="margin-bottom:12px;">
                <tr><th>Health Score</th><td><strong>${scoreB}</strong></td></tr>
                <tr><th>Safety Level</th><td style="text-transform:uppercase;" class="risk-${safetyB}"><strong>${safetyB}</strong></td></tr>
              </table>
              ${highlightsB ? `
                <h4 style="font-size:11px;text-transform:uppercase;color:#555;margin-bottom:6px;">Safety Highlights</h4>
                <ul style="font-size:12px;padding-left:16px;margin:0;line-height:1.5;color:#444;">
                  ${highlightsB}
                </ul>
              ` : ''}
            </div>
          </div>

          <div class="section-main">
            <h3>Head-to-Head Nutrition Comparison ${res.comparison_table?.basis ? `<span style="font-size:12px;font-weight:normal;color:#666;">(Basis: ${escapeHtml(res.comparison_table.basis)})</span>` : ''}</h3>
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Metric / Field</th>
                  <th>Product A (${prodABrand})</th>
                  <th>Product B (${prodBBrand})</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <div class="section-grid">
            <div class="grid-card">
              <h3 style="font-size:11px;color:#555;text-transform:uppercase;">English Verdict</h3>
              <p style="font-size:11.5px;line-height:1.5;color:#333;">${escapeHtml(res.verdict_english || 'N/A')}</p>
            </div>
            <div class="grid-card">
              <h3 style="font-size:11px;color:#555;text-transform:uppercase;">Hindi Verdict</h3>
              <p style="font-size:11.5px;line-height:1.5;color:#333;">${escapeHtml(res.verdict_hindi || 'N/A')}</p>
            </div>
          </div>
        `
      } else {
        const prodName = escapeHtml(res.product_name || 'Food Product')
        const brandName = escapeHtml(res.brand || 'Unbranded')
        title = `Report - ${prodName}`

        const additivesRows = Array.isArray(res.additives) && res.additives.length > 0 
          ? res.additives.map((add: any) => `
            <tr>
              <td style="font-weight:bold;">${escapeHtml(add.name)} ${add.code ? `(${escapeHtml(add.code)})` : ''}</td>
              <td class="badge risk-${escapeHtml(add.risk || 'low')}">${escapeHtml((add.risk || 'low').toUpperCase())}</td>
              <td>${escapeHtml(add.description || '')}</td>
              <td style="font-size:11px;color:#555;">${escapeHtml(add.source || 'Standard Reference')}</td>
            </tr>
          `).join('')
          : '<tr><td colspan="4" style="text-align:center;color:#666;">No chemical additives or E-numbers identified.</td></tr>'

        const ingredientsList = Array.isArray(res.ingredients) && res.ingredients.length > 0
          ? res.ingredients.map((ing: any) => `
            <span class="ing-item status-${escapeHtml(ing.status || 'safe')}">
              ${escapeHtml(ing.name)} ${ing.status && ing.status !== 'safe' ? `(${escapeHtml(ing.status)})` : ''}
            </span>
          `).join(', ')
          : 'Not parsed'

        const healthScoreDisplay = res.health_score != null ? res.health_score : '--'
        const safetyLevel = escapeHtml(res.safety_level || 'insufficient_evidence')
        const upfScore = res.upf_score ? `NOVA Group ${res.upf_score}` : 'Not classified'

        dataHtml = `
          <div class="header-main">
            <h1>CLINICAL INGREDIENTS AUDIT REPORT</h1>
            <p class="subtitle">ScanSafe ULTRA Food Intelligence Analytics</p>
          </div>

          <div class="section-grid">
            <div class="grid-card">
              <h3>Subject Profile</h3>
              <table class="clinical-table-mini">
                <tr><th>Account Email</th><td>${escapeHtml(user.email)}</td></tr>
                <tr><th>Scan Timestamp</th><td>${escapeHtml(new Date(scan.created_at).toLocaleString())}</td></tr>
                <tr><th>Regional Context</th><td>India (IN)</td></tr>
              </table>
            </div>

            <div class="grid-card">
              <h3>Product Overview</h3>
              <table class="clinical-table-mini">
                <tr><th>Product Name</th><td><strong>${prodName}</strong></td></tr>
                <tr><th>Manufacturer / Brand</th><td>${brandName}</td></tr>
                <tr><th>UPF NOVA Classification</th><td><strong>${escapeHtml(upfScore)}</strong></td></tr>
              </table>
            </div>
          </div>

          <div class="section-main">
            <div class="score-container">
              <div class="score-circle">
                <span class="score-num">${healthScoreDisplay}</span>
                <span class="score-lbl">${res.health_score != null ? 'Score / 100' : 'Unrated'}</span>
              </div>
              <div class="score-summary">
                <h3>Diagnostic Summary</h3>
                <p>Safety Evaluation Status: <strong style="text-transform:uppercase;" class="risk-${safetyLevel}">${safetyLevel}</strong></p>
                <p>${escapeHtml(res.health_score_reason || res.description || 'This product was analyzed by ScanSafe Food Intelligence.')}</p>
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

          ${(res.glycemic_index_estimate || res.upf_reason) ? `
          <div class="section-grid">
            ${res.glycemic_index_estimate ? `
            <div class="grid-card">
              <h3>Glycemic & Metabolic Impact</h3>
              <table class="clinical-table-mini">
                <tr><th>Glycemic Index Estimate</th><td class="risk-${escapeHtml(res.glycemic_index_estimate)}">${escapeHtml(res.glycemic_index_estimate.toUpperCase())}</td></tr>
                ${res.glycemic_reason ? `<tr><th>Rationale</th><td>${escapeHtml(res.glycemic_reason)}</td></tr>` : ''}
              </table>
            </div>` : ''}

            ${res.upf_reason ? `
            <div class="grid-card">
              <h3>Processing Level Details</h3>
              <table class="clinical-table-mini">
                <tr><th>NOVA Rating</th><td><strong>${escapeHtml(upfScore)}</strong></td></tr>
                <tr><th>Processing Rationale</th><td>${escapeHtml(res.upf_reason)}</td></tr>
              </table>
            </div>` : ''}
          </div>
          ` : ''}
        `
      }
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

      const res = meal.analysis_json || {}
      const mealName = escapeHtml(meal.name || 'Composite Meal')
      title = `Meal Report - ${mealName}`

      const productRows = Array.isArray(res.products_scanned)
        ? res.products_scanned.map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')
        : '<li>None</li>'

      const additivesList = Array.isArray(res.additives) && res.additives.length > 0
        ? res.additives.map((a: any) => `<li><strong>${escapeHtml(a.name)} ${a.code ? `(${escapeHtml(a.code)})` : ''}</strong> - ${escapeHtml(a.description || '')}</li>`).join('')
        : '<li>No chemical additives identified.</li>'

      const nut = res.nutrition_summary || {}

      dataHtml = `
        <div class="header-main">
          <h1>COMPOSITE MEAL CLINICAL REPORT</h1>
          <p class="subtitle">ScanSafe ULTRA Composite Food Analytics</p>
        </div>

        <div class="section-grid">
          <div class="grid-card">
            <h3>Subject Profile</h3>
            <table class="clinical-table-mini">
              <tr><th>Account Email</th><td>${escapeHtml(user.email)}</td></tr>
              <tr><th>Composite Timestamp</th><td>${escapeHtml(new Date(meal.created_at).toLocaleString())}</td></tr>
              <tr><th>Regional Context</th><td>India (IN)</td></tr>
            </table>
          </div>

          <div class="grid-card">
            <h3>Meal Details</h3>
            <table class="clinical-table-mini">
              <tr><th>Meal Name</th><td><strong>${mealName}</strong></td></tr>
              <tr><th>Scanned Items Count</th><td>${escapeHtml(res.product_count ?? 0)} products</td></tr>
              <tr><th>Combined Health Score</th><td><strong>${res.health_score != null ? `${res.health_score} / 100` : 'Unrated'}</strong></td></tr>
            </table>
          </div>
        </div>

        <div class="section-main">
          <h3>Diagnostic Meal Summary</h3>
          <p style="font-size:15px;line-height:1.6;font-style:italic;color:#333;background:#f5f5f5;padding:15px;border-left:4px solid #10b981;border-radius:4px;">
            "${escapeHtml(res.composite_verdict || 'Meal nutrition calculated successfully.')}"
          </p>
        </div>

        <div class="section-main">
          <h3>Composite Nutrition Facts Panel</h3>
          <table class="clinical-table" style="max-width:500px;">
            <thead>
              <tr><th>Nutrient</th><th>Combined Quantity</th></tr>
            </thead>
            <tbody>
              <tr><td>Calories</td><td><strong>${escapeHtml(nut.calories != null ? `${nut.calories} kcal` : 'N/A')}</strong></td></tr>
              <tr><td>Total Fats</td><td>${escapeHtml(nut.fat ?? 'N/A')}</td></tr>
              <tr><td>Saturated Fats</td><td>${escapeHtml(nut.saturated_fat ?? 'N/A')}</td></tr>
              <tr><td>Total Carbohydrates</td><td>${escapeHtml(nut.carbs ?? 'N/A')}</td></tr>
              <tr><td>Simple Sugars</td><td><strong>${escapeHtml(nut.sugar ?? 'N/A')}</strong></td></tr>
              <tr><td>Dietary Fiber</td><td>${escapeHtml(nut.fiber ?? 'N/A')}</td></tr>
              <tr><td>Dietary Proteins</td><td><strong>${escapeHtml(nut.protein ?? 'N/A')}</strong></td></tr>
              <tr><td>Sodium Load</td><td>${escapeHtml(nut.sodium ?? 'N/A')}</td></tr>
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

        <div style="margin-top: 30px; padding: 14px 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; font-size: 11px; color: #6b7280; line-height: 1.6;">
          <strong>Notice & Methodological Limitations:</strong> This report provides nutritional estimates based on printed packaging declarations and extracted ingredients. It does not certify chemical purity, product safety, legal compliance, or medical suitability. AI models can misread damaged, curved, or blurry labels; missing or unreadable information is marked as unknown. This report is for educational and informational purposes only and does not constitute clinical or medical advice.
        </div>
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
