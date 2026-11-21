import { NextResponse } from 'next/server'
import { generateViralAd, VIRAL_PRODUCT_PRESETS } from '@/lib/ad-generator'
import { z } from 'zod'

const GenerateAdSchema = z.object({
  presetId: z.string().optional(),
  productName: z.string().min(1).max(200).optional(),
  ingredients: z.array(z.string()).optional(),
  frontClaims: z.array(z.string()).optional(),
  healthScore: z.number().min(0).max(100).optional(),
  category: z.string().max(100).optional(),
  lang: z.string().max(10).optional().default('en')
})

export async function POST(req: Request) {
  try {
    let body = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    }

    const parsed = GenerateAdSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.format() }, { status: 400 })
    }

    const { presetId, productName, ingredients, frontClaims, healthScore, category, lang } = parsed.data

    // If presetId provided, load from pre-built viral catalog
    if (presetId) {
      const preset = VIRAL_PRODUCT_PRESETS.find(p => p.id === presetId)
      if (!preset) {
        return NextResponse.json({ error: `Preset "${presetId}" not found` }, { status: 404 })
      }

      const adPackage = generateViralAd(
        preset.name,
        preset.ingredients,
        preset.frontClaims,
        preset.healthScore,
        preset.category,
        lang
      )

      return NextResponse.json({ success: true, adPackage, preset })
    }

    // Custom product ad generation
    const name = productName || 'Commercial Packaged Food'
    const ings = ingredients && ingredients.length > 0 ? ingredients : ['Refined Flour', 'Palm Oil', 'Sugar', 'Preservatives']
    const claims = frontClaims || ['Healthy Choice']
    const score = healthScore !== undefined ? healthScore : 30
    const cat = category || 'Snacks'

    const adPackage = generateViralAd(name, ings, claims, score, cat, lang)

    return NextResponse.json({ success: true, adPackage })
  } catch (err: any) {
    console.error('Viral ad generation error:', err)
    return NextResponse.json({ error: 'Failed to generate viral ad package: ' + (err.message || 'Unknown error') }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    presets: VIRAL_PRODUCT_PRESETS
  })
}
