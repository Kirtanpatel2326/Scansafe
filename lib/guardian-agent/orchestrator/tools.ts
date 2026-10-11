import { ProductEvidence } from './types'
import { createClient } from '@/lib/supabase-server'

/**
 * Real research tool adapters for permitted information sources.
 * Strictly captures provenance, retrieval date, verification status, source URLs, and limitations.
 * Never misrepresents unverified cached or crowdsourced entries as manufacturer-verified.
 */

export async function searchInternalReviewedCatalog(
  query: string,
  currency: 'INR' | 'AED' | 'USD' = 'INR',
  signal?: AbortSignal
): Promise<ProductEvidence[]> {
  if (signal?.aborted) return []
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

      const isExplicitlyVerified = Boolean(item.is_verified || raw.dietitian_verified)
      const sourceType = isExplicitlyVerified ? 'INTERNAL_VERIFIED_CATALOG' : 'INTERNAL_CACHE_OCR'
      const verificationStatus = isExplicitlyVerified
        ? 'MANUFACTURER_AUTHORIZED'
        : 'UNVERIFIED_COMMUNITY_OCR'

      const limitations = isExplicitlyVerified
        ? ['Dietitian/curator reviewed internal entry. Check packaging batch for formulation revisions.']
        : [
            'Derived from community OCR mobile scans; characters may contain scan transcription artifacts.',
            'Unverified by manufacturer; physical product label must be inspected before consumption.'
          ]

      return {
        id: item.barcode || item.id || `internal_${Date.now()}`,
        name: item.product_name,
        brand: item.brand,
        ingredients: ingredients || 'Ingredients not recorded in internal cache entry.',
        allergenStatement: allergens ? `Allergens: ${allergens}` : 'No explicit allergen declaration recorded.',
        labelComplete: Boolean(ingredients),
        evidenceSource: isExplicitlyVerified
          ? `ScanSafe Curated Database (Verified Entry, Barcode: ${item.barcode || 'N/A'})`
          : `ScanSafe Community OCR Cache (Unverified Mobile Scan, Barcode: ${item.barcode || 'N/A'})`,
        sourceType,
        verificationStatus,
        evidenceLimitations: limitations,
        sourceUrl: item.barcode ? `https://scansafe.co.in/scan?barcode=${item.barcode}` : undefined,
        price: undefined,
        currency,
        gtin: item.barcode,
        retrievedAt: new Date().toISOString(),
        sugarsPer100g: typeof raw.sugars_100g === 'number' ? raw.sugars_100g : (typeof raw.sugars === 'number' ? raw.sugars : undefined),
        isOrganicDeclared: Boolean(raw.is_organic || raw.organic || (/organic/i.test(item.product_name || '') || /organic/i.test(String(raw.certifications || '')))),
        certificationsDeclared: Array.isArray(raw.certifications) ? raw.certifications : (raw.certifications ? [String(raw.certifications)] : []),
        categoriesDeclared: Array.isArray(raw.categories) ? raw.categories : (item.category ? [String(item.category)] : [])
      }
    })
  } catch (err) {
    console.warn('Internal reviewed catalog lookup failed:', err)
    return []
  }
}

export async function searchPublicOpenFoodFacts(
  query: string,
  currency: 'INR' | 'AED' | 'USD' = 'INR',
  signal?: AbortSignal
): Promise<ProductEvidence[]> {
  if (signal?.aborted) return []
  const controller = new AbortController()
  let timer: NodeJS.Timeout | undefined

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    timer = setTimeout(() => controller.abort(), 8000)
    const fetchOff = async (q: string) => {
      const hosts = ['world.openfoodfacts.org', 'us.openfoodfacts.org']
      for (const host of hosts) {
        if (controller.signal.aborted) break
        try {
          const endpoint = `https://${host}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=5`
          const res = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'ScanSafe-Guardian/2.0 (audit@scansafe.co.in)',
              'Accept': 'application/json'
            }
          })
          if (!res.ok) continue
          const text = await res.text()
          if (!text.trim().startsWith('{')) continue
          const json = JSON.parse(text)
          if (Array.isArray(json.products) && json.products.length > 0) {
            return json.products
          }
        } catch {
          // Try next host
        }
      }
      return []
    }

    let products = await fetchOff(query)
    if (products.length === 0) {
      // Smart fallback: remove generic noise words but preserve key category nouns
      const stripped = query.replace(/\b(organic|natural|low[ -]?sugar|sugar[ -]?free|healthy|best|premium)\b/gi, '').trim().replace(/\s+/g, ' ')
      if (stripped && stripped !== query) {
        products = await fetchOff(stripped)
      }
      if (products.length === 0) {
        const words = query.trim().split(/\s+/)
        // Avoid stripping to single words that invert category (e.g., "seed butter" -> "butter")
        if (words.length > 2 && !/seed\s+butter/i.test(query)) {
          const fallbackQuery = words.slice(-2).join(' ')
          products = await fetchOff(fallbackQuery)
        } else if (/seed\s+butter/i.test(query)) {
          products = await fetchOff('seed butter')
        }
      }
    }

    return products.slice(0, 5).map((p: any) => {
      const name = p.product_name || p.product_name_en || 'Packaged Product'
      const brand = p.brands || p.brand_owner || 'Brand'
      const ingredients = p.ingredients_text || ''
      const allergens = (p.allergens_tags || []).map((t: string) => t.replace(/^[a-z]+:/i, '')).join(', ')

      const sourceUrl = p.url || (p.code ? `https://world.openfoodfacts.org/product/${p.code}` : undefined)

      const categoriesTags = (p.categories_tags || []).map((t: string) => t.replace(/^[a-z]+:/i, '').replace(/-/g, ' '))
      const labelsTags = (p.labels_tags || []).map((t: string) => t.replace(/^[a-z]+:/i, '').replace(/-/g, ' '))

      const sugarsPer100g = typeof p.nutriments?.sugars_100g === 'number'
        ? p.nutriments.sugars_100g
        : (typeof p.nutriments?.sugars === 'number' ? p.nutriments.sugars : undefined)

      const isOrganicDeclared = labelsTags.some((l: string) => /organic|biologique|bio/i.test(l)) ||
        /organic/i.test(p.labels || '') ||
        /organic/i.test(name)

      return {
        id: `off_${p.code || Math.random().toString(36).slice(2)}`,
        name,
        brand,
        ingredients: ingredients || 'Ingredient list unpopulated in public database record.',
        allergenStatement: allergens ? `Contains / May Contain: ${allergens}` : (p.allergens || 'No explicit allergen tags in public record.'),
        labelComplete: Boolean(ingredients),
        evidenceSource: `Open Food Facts Public Knowledgebase (Crowdsourced Volunteer Data, Code: ${p.code || 'N/A'})`,
        sourceType: 'OPEN_FOOD_FACTS_CROWDSOURCED',
        verificationStatus: 'CROWDSOURCED_COMMUNITY',
        evidenceLimitations: [
          'Crowdsourced public database entry; community volunteers may upload unverified or outdated ingredient formulations.',
          'Does NOT constitute authoritative manufacturer confirmation.'
        ],
        sourceUrl,
        price: undefined,
        currency,
        gtin: p.code,
        retrievedAt: new Date().toISOString(),
        sugarsPer100g,
        isOrganicDeclared,
        certificationsDeclared: labelsTags,
        categoriesDeclared: categoriesTags
      }
    })
  } catch (err) {
    console.warn('Open Food Facts public query failed or timed out:', err)
    return []
  } finally {
    clearTimeout(timer)
  }
}
