import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scanIds, mealName } = await request.json()
    if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
      return NextResponse.json({ error: 'No scans selected for composer.' }, { status: 400 })
    }

    // Retrieve scans from DB
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('*')
      .in('id', scanIds)
      .eq('user_id', user.id)

    if (scansError || !scans || scans.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve selected scans.' }, { status: 400 })
    }

    // Aggregate macros and details
    let totalCalories = 0
    let totalFatGrams = 0
    let totalSaturatedFatGrams = 0
    let totalCarbsGrams = 0
    let totalSugarGrams = 0
    let totalProteinGrams = 0
    let totalSodiumMg = 0

    const mergedIngredients: string[] = []
    const mergedAdditives: any[] = []
    const mergedAllergens: string[] = []
    const productNames: string[] = []

    scans.forEach((scan) => {
      const res = scan.result_json
      productNames.push(res.product_name || scan.product_name)

      // Aggregating macros
      const nut = res.nutrition_facts || {}
      if (nut.calories) totalCalories += Number(nut.calories) || 0
      if (nut.fat) totalFatGrams += parseFloat(nut.fat) || 0
      if (nut.saturated_fat) totalSaturatedFatGrams += parseFloat(nut.saturated_fat) || 0
      if (nut.carbs) totalCarbsGrams += parseFloat(nut.carbs) || 0
      if (nut.sugar) totalSugarGrams += parseFloat(nut.sugar) || 0
      if (nut.protein) totalProteinGrams += parseFloat(nut.protein) || 0
      if (nut.sodium) totalSodiumMg += parseFloat(nut.sodium) || 0

      // Additives
      if (Array.isArray(res.additives)) {
        res.additives.forEach((add: any) => {
          if (!mergedAdditives.some((a) => a.name === add.name || a.code === add.code)) {
            mergedAdditives.push(add)
          }
        })
      }

      // Ingredients list
      if (Array.isArray(res.ingredients)) {
        res.ingredients.forEach((ing: any) => {
          if (!mergedIngredients.some((i) => i.toLowerCase() === ing.name.toLowerCase())) {
            mergedIngredients.push(ing.name)
          }
        })
      }

      // Allergens
      if (Array.isArray(res.allergens)) {
        res.allergens.forEach((all: string) => {
          if (!mergedAllergens.some((a) => a.toLowerCase() === all.toLowerCase())) {
            mergedAllergens.push(all)
          }
        })
      }
    })

    const averageHealthScore = Math.round(
      scans.reduce((sum, s) => sum + (s.health_score || 0), 0) / scans.length
    )

    // Call Gemini to get a composite nutritional evaluation of this combination
    let compositeVerdict = `Combined analysis of: ${productNames.join(', ')}.`
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (geminiApiKey) {
      try {
        const promptText = `
You are ScanSafe ULTRA, an advanced nutritional science AI.
Evaluate the meal combination of the following food products:
Products: ${productNames.join(', ')}
Total Calories: ${totalCalories} kcal
Total Carbs: ${totalCarbsGrams}g (of which Sugars: ${totalSugarGrams}g)
Total Fats: ${totalFatGrams}g (Saturated: ${totalSaturatedFatGrams}g)
Total Protein: ${totalProteinGrams}g
Total Sodium: ${totalSodiumMg}mg
Merged Additives: ${JSON.stringify(mergedAdditives.map(a => a.name))}

Provide a concise, professional 3-sentence evaluation of this combined meal. Discuss if it constitutes a balanced meal, highlight if it has dangerously high glycemic loads, elevated trans-fats, sodium loads, or chemical combinations, and recommend a simple addition (e.g. greens, nuts) to balance it. Return ONLY plain text.
`
        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents: [
              { parts: [{ text: promptText }] }
            ]
          },
          { headers: { 'content-type': 'application/json' } }
        )
        const text = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) compositeVerdict = text
      } catch (err: any) {
        console.error('Error generating composite verdict from Gemini:', err.message)
      }
    }

    const compositeAnalysis = {
      meal_name: mealName || 'My Composite Meal',
      health_score: averageHealthScore,
      composite_verdict: compositeVerdict,
      product_count: scans.length,
      products_scanned: productNames,
      nutrition_summary: {
        calories: totalCalories,
        fat: `${totalFatGrams.toFixed(1)}g`,
        saturated_fat: `${totalSaturatedFatGrams.toFixed(1)}g`,
        carbs: `${totalCarbsGrams.toFixed(1)}g`,
        sugar: `${totalSugarGrams.toFixed(1)}g`,
        protein: `${totalProteinGrams.toFixed(1)}g`,
        sodium: `${totalSodiumMg.toFixed(1)}mg`
      },
      additives: mergedAdditives,
      allergens: mergedAllergens,
      ingredients: mergedIngredients
    }

    // Save to database
    const { data: savedMeal, error: saveErr } = await supabase
      .from('meal_compositions')
      .insert({
        user_id: user.id,
        name: mealName || 'Composite Meal',
        scans_list: scanIds,
        analysis_json: compositeAnalysis
      })
      .select()
      .single()

    if (saveErr) {
      console.error('Failed to save meal composition:', saveErr)
    }

    return NextResponse.json({
      success: true,
      meal: compositeAnalysis,
      mealId: savedMeal?.id
    })
  } catch (error: any) {
    console.error('Error in meal composer route:', error)
    return NextResponse.json({ error: 'Failed to compose meal nutrients. Please try again later.' }, { status: 500 })
  }
}
