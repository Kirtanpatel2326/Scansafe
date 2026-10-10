import { ProductEvidence } from './types'
import { createClient } from '@/lib/supabase-server'

/**
 * Real research tool adapters for permitted information sources.
 * Strictly captures provenance, retrieval date, evidence status, and limitations.
 */

export async function searchInternalReviewedCatalog(query: string, currency: 'INR' | 'AED' | 'USD' = 'INR'): Promise<ProductEvidence[]> {
  try {
    let supabase: any
    try {
      supabase = await createClient()
    } catch {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) return []
      const { createClient: createBaseClient } = await import('@supabase/supabase-js')
      supabase = createBaseClient(url, key)
    }
    const { data, error } = await supabase
      .from('products_cache')
      .select('*')
      .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10)

    if (error || !data || data.length === 0) return []

    return data.map((item: any) => {
      const raw = item.raw_data || {}
      const ingredients = Array.isArray(raw.ingredients)
        ? raw.ingredients.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')
        : (item.ingredients || '')
      const allergens = Array.isArray(raw.allergens_declared)
        ? raw.allergens_declared.join(', ')
        : (item.allergens_declared || '')

      return {
        id: item.barcode || item.id || `internal_${Date.now()}`,
        name: item.product_name,
        brand: item.brand,
        ingredients: ingredients || 'Ingredients not recorded in verified cache.',
        allergenStatement: allergens ? `Allergens: ${allergens}` : 'No explicit allergen declaration recorded.',
        labelComplete: Boolean(ingredients),
        evidenceSource: `ScanSafe Internal Verified Catalog (Barcode: ${item.barcode || 'N/A'}, Version: ${item.version || 1})`,
        sourceType: 'INTERNAL_VERIFIED_CATALOG',
        price: undefined,
        currency,
        gtin: item.barcode,
        retrievedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    console.warn('Internal reviewed catalog lookup failed:', err)
    return []
  }
}

export async function searchPublicOpenFoodFacts(query: string, currency: 'INR' | 'AED' | 'USD' = 'INR'): Promise<ProductEvidence[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)

  try {
    const endpoint = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ScanSafe-Guardian/2.0 (contact@scansafe.co.in)' }
    })

    if (!res.ok) return []
    const json = await res.json()
    const products = json.products || []

    return products.slice(0, 5).map((p: any) => {
      const name = p.product_name || p.product_name_en || 'Packaged Product'
      const brand = p.brands || p.brand_owner || 'Brand'
      const ingredients = p.ingredients_text || ''
      const allergens = (p.allergens_tags || []).map((t: string) => t.replace(/^[a-z]+:/i, '')).join(', ')

      return {
        id: `off_${p.code || Math.random().toString(36).slice(2)}`,
        name,
        brand,
        ingredients: ingredients || 'Ingredient list unpopulated in public database record.',
        allergenStatement: allergens ? `Contains / May Contain: ${allergens}` : (p.allergens || 'No explicit allergen tags in public record.'),
        labelComplete: Boolean(ingredients),
        evidenceSource: `Open Food Facts Public Open Database (Crowdsourced / Unverified, ID: ${p.code || 'N/A'})`,
        sourceType: 'OPEN_FOOD_FACTS_PUBLIC',
        price: undefined,
        currency,
        gtin: p.code,
        retrievedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    console.warn('Open Food Facts public query failed or timed out:', err)
    return []
  } finally {
    clearTimeout(timer)
  }
}
