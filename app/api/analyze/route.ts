import { createClient } from '@/lib/supabase-server'
import { analyzeLabel, enrichIngredientsText, applyPreferences } from '@/lib/claude'
import { NextResponse } from 'next/server'
import axios from 'axios'

// Simple in-memory IP rate limiter
const globalLimiter = globalThis as unknown as {
  ipRequestCounts?: Map<string, { count: number; resetAt: number }>
}

if (!globalLimiter.ipRequestCounts) {
  globalLimiter.ipRequestCounts = new Map()
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limitWindowMs = 60 * 1000 // 1 minute
  const maxRequests = 10

  const record = globalLimiter.ipRequestCounts!.get(ip)

  if (!record || now > record.resetAt) {
    globalLimiter.ipRequestCounts!.set(ip, { count: 1, resetAt: now + limitWindowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count += 1
  return true
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a minute before trying again.'
      }, { status: 429 })
    }

    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to scan.' }, { status: 401 })
    }

    // Get user profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Proactively create profile if missing
      const email = user.email || ''
      const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'User'
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: email,
          full_name: fullName,
          plan: 'free',
          scans_today: 0,
          scans_reset_at: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()
        
      if (insertError) {
        console.error('Failed to create user profile:', insertError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
      profile = newProfile
    }

    // Check plan expiration on-the-fly and sync to DB
    const now = new Date()
    const hasExpired = profile.plan === 'pro' && profile.plan_expires_at && new Date(profile.plan_expires_at) <= now

    if (hasExpired) {
      console.log(`User ${user.id} subscription expired on ${profile.plan_expires_at}. Reverting to free plan.`)
      
      const { error: revertError } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          plan_type: 'free',
          plan_expires_at: null
        })
        .eq('id', user.id)

      if (revertError) {
        console.error('Failed to auto-revert expired profile plan to free:', revertError)
      } else {
        profile.plan = 'free'
        profile.plan_type = 'free'
        profile.plan_expires_at = null
      }
    }

    // Check scan limits for free users
    const todayStr = new Date().toISOString().split('T')[0]
    if (profile.plan !== 'pro') {
      let scansToday = profile.scans_today
      let resetAt = profile.scans_reset_at

      // Check if reset is needed
      if (resetAt !== todayStr) {
        scansToday = 0
        resetAt = todayStr
      }

      if (scansToday >= 5) {
        return NextResponse.json({
          error: 'LIMIT_EXCEEDED',
          message: 'You have reached your limit of 5 free scans for today. Please upgrade to Pro for unlimited scans!'
        }, { status: 403 })
      }

      // Increment count in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          scans_today: scansToday + 1,
          scans_reset_at: resetAt
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update scan count:', updateError)
      }
    }

    // Parse request body
    const body = await request.json()
    const { barcode, image, preferences, isDemo, filename, productName } = body
    const finalPrefs = preferences || (profile.dietary_profile?.allergens || [])

    // Validate image size & type if uploading image for OCR Vision
    if (image && !barcode && !isDemo) {
      if (image.startsWith('data:image/')) {
        const match = image.match(/^data:image\/(jpeg|png|webp);base64,/)
        if (!match) {
          return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' }, { status: 400 })
        }
      }
      
      const base64DataStr = image.includes('base64,') ? image.split('base64,')[1] : image
      const approximateSizeBytes = (base64DataStr.length * 3) / 4
      const maxSizeBytes = 8 * 1024 * 1024 // 8MB

      if (approximateSizeBytes > maxSizeBytes) {
        return NextResponse.json({ error: 'File size too large. Image must be under 8MB.' }, { status: 400 })
      }
    }

    // 1. Check if barcode search is requested
    if (barcode) {
      console.log(`Smart routing lookup for barcode: ${barcode}`)
      
      // A. Check local cache first
      const { data: cachedProduct, error: cacheError } = await supabase
        .from('products_cache')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (!cacheError && cachedProduct && cachedProduct.raw_data) {
        console.log(`Cache hit for barcode: ${barcode}`)
        const analysis = applyPreferences(cachedProduct.raw_data, finalPrefs)
        
        // Save scan to user history
        const { data: scanData } = await supabase
          .from('scans')
          .insert({
            user_id: user.id,
            product_name: analysis.product_name || 'Unknown Product',
            barcode: barcode,
            health_score: analysis.health_score || 0,
            safety_level: analysis.safety_level || 'moderate',
            result_json: analysis
          })
          .select()
          .single()

        return NextResponse.json({
          success: true,
          analysis,
          scanId: scanData?.id,
          source: 'cache'
        })
      }

      // B. Fetch from Open Food Facts API (OFF v3)
      try {
        console.log(`Cache miss. Querying Open Food Facts for barcode: ${barcode}`)
        const offRes = await axios.get(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`, {
          headers: { 'User-Agent': 'ScanSafe - Web - Version 1.0' },
          timeout: 8000
        })

        const productData = offRes.data?.product
        if (productData && (productData.ingredients_text || productData.ingredients_text_en)) {
          const rawName = productData.product_name || productData.product_name_en || 'Unknown Product'
          const rawBrand = productData.brands || 'Unknown Brand'
          const rawIngredients = productData.ingredients_text || productData.ingredients_text_en
          const rawNutriments = productData.nutriments || {}

          console.log(`Found product in Open Food Facts. Enriching text with AI...`)
          
          // Call AI to parse and audit ingredients text
          const enriched = await enrichIngredientsText(
            rawIngredients,
            rawName,
            rawBrand,
            rawNutriments,
            finalPrefs
          )

          // Save enriched product data to cache
          const { error: cacheInsertErr } = await supabase
            .from('products_cache')
            .insert({
              barcode: barcode,
              product_name: rawName,
              brand: rawBrand,
              raw_data: enriched
            })

          if (cacheInsertErr) {
            console.error('Failed to update product cache:', cacheInsertErr)
          }

          // Save scan to user history
          const { data: scanData } = await supabase
            .from('scans')
            .insert({
              user_id: user.id,
              product_name: enriched.product_name || rawName,
              barcode: barcode,
              health_score: enriched.health_score || 0,
              safety_level: enriched.safety_level || 'moderate',
              result_json: enriched
            })
            .select()
            .single()

          return NextResponse.json({
            success: true,
            analysis: enriched,
            scanId: scanData?.id,
            source: 'open_food_facts'
          })
        }
      } catch (offErr: any) {
        console.error('Error lookup in Open Food Facts:', offErr.message)
      }
      
      // If barcode not found in OFF and no image upload is provided, return not found warning
      if (!image) {
        return NextResponse.json({
          success: false,
          errorType: 'BARCODE_NOT_FOUND',
          message: 'Product not found in Open Food Facts database. Please snap a photo of the ingredients list so our AI Vision can scan it directly.'
        })
      }
    }

    // 2. Fallback to Demo Data
    if (isDemo) {
      const demoAnalysis = {
        product_name: "Crunchy Choco Shells",
        brand: "MegaCereal Corp",
        health_score: 32,
        safety_level: "danger" as const,
        description: "A highly processed chocolate-flavored cereal containing elevated levels of added refined sugars, artificial preservatives, and synthetic dyes.",
        ingredients: [
          { name: "Refined Wheat Flour", status: "caution" as const, reason: "High glycemic index, stripped of natural fiber and wheat germ." },
          { name: "Sugar", status: "avoid" as const, reason: "12 grams of added sugars per serving. Excess sugar intake is linked to obesity, diabetes, and heart disease." },
          { name: "Palm Oil", status: "caution" as const, reason: "High in saturated fat, environmentally controversial." },
          { name: "High Fructose Corn Syrup", status: "avoid" as const, reason: "Highly processed sweetener linked to fatty liver disease and insulin resistance." },
          { name: "Red 40 (Allura Red)", status: "avoid" as const, reason: "Synthetic coal-tar dye banned in several European nations, linked to hyperactivity in children." },
          { name: "BHT (Butylated Hydroxytoluene)", status: "avoid" as const, reason: "Chemical preservative used to prevent fat spoilage. Deemed a potential endocrine disruptor." }
        ],
        additives: [
          { name: "Allura Red AC", code: "E129", risk: "high" as const, description: "Synthetic artificial food dye. Associated with hyperactivity and allergic reactions in sensitive children.", source: "EFSA" },
          { name: "Butylated Hydroxytoluene", code: "E321", risk: "high" as const, description: "Preservative. Animal studies link high doses to hormone disruption and tumor promotion.", source: "IARC" },
          { name: "Mono and Diglycerides", code: "E471", risk: "low" as const, description: "Common emulsifier used to blend fats and water; generally recognized as safe.", source: "FDA" }
        ],
        allergens: ["Gluten", "Soy (emulsifier)"],
        nutrition_facts: {
          calories: 140,
          fat: "4g",
          saturated_fat: "2g",
          trans_fat: "0g",
          cholesterol: "0mg",
          sodium: "180mg",
          carbs: "26g",
          fiber: "1g",
          sugar: "12g",
          protein: "2g"
        },
        recommendations: [
          "Seven Sundays Maple Cinnamon Cereal",
          "Magic Spoon Low-Carb Cocoa Cereal",
          "Organic Rolled Oats topped with natural cacao nibs"
        ],
        alternatives_detailed: [
          {
            name: "Cocoa Cereal",
            brand: "Magic Spoon",
            reason: "High protein, zero added sugars, keto friendly, clean ingredients.",
            estimated_price_inr: 499,
            buy_url_blinkit: "https://blinkit.com/s/?q=keto+cereal",
            buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=keto+cereal"
          }
        ],
        upf_score: 4,
        microplastics_risk: "high" as const,
        microplastics_reason: "Cereal package is contained within a thin polyethylene plastic bag inside a cardboard carton.",
        sustainability_grade: "D" as const,
        sustainability_reason: "Contains palm oil from non-certified sources, causing higher deforestation impacts.",
        glycemic_index_estimate: "high" as const,
        glycemic_reason: "High refined starches and added sugars promote rapid glucose assimilation.",
        health_risk_breakdown: {
          heart: "medium" as const,
          diabetes: "high" as const,
          inflammation: "high" as const,
          gut_health: "medium" as const
        }
      }

      // Save to scans table
      const { data: scanData } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          product_name: demoAnalysis.product_name,
          health_score: demoAnalysis.health_score,
          safety_level: demoAnalysis.safety_level,
          result_json: demoAnalysis
        })
        .select()
        .single()

      return NextResponse.json({
        success: true,
        analysis: demoAnalysis,
        scanId: scanData?.id,
        source: 'demo'
      })
    }

    // 3. Fallback to full Image OCR Vision analysis
    if (!image) {
      return NextResponse.json({ error: 'Image or barcode is required for analysis' }, { status: 400 })
    }

    const analysis = await analyzeLabel(image, finalPrefs, filename || '', productName || '')

    // Save scan to scans table
    const { data: scanData, error: scanInsertError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        product_name: analysis.product_name || 'Unknown Product',
        health_score: analysis.health_score || 0,
        safety_level: analysis.safety_level || 'moderate',
        result_json: analysis
      })
      .select()
      .single()

    if (scanInsertError) {
      console.error('Error saving scan to history:', scanInsertError)
    }

    return NextResponse.json({
      success: true,
      analysis,
      scanId: scanData?.id,
      source: 'vision_ai'
    })
  } catch (error: any) {
    if (error.message === 'PRODUCT_SELECTION_REQUIRED') {
      return NextResponse.json({
        success: false,
        errorType: 'PRODUCT_SELECTION_REQUIRED',
        message: 'AI Vision quota exceeded. Please select your product from the options below.'
      })
    }
    console.error('Error in analyze API:', error)
    return NextResponse.json({ error: 'Failed to analyze food product. Please try again later.' }, { status: 500 })
  }
}
