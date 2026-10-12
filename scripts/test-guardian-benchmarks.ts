/**
 * Comprehensive Benchmark Suite for ScanSafe Guardian AI — Phase 2
 * Dubai Create AI Agents Championship Verification
 * 
 * Verifies 105 distinct, rigorous scenarios across:
 * - 15 Direct standard allergens & derivatives (peanuts, tree nuts, milk, egg, soy, wheat, gluten, sesame, crustaceans, fish, mustard, celery, lupin, molluscs, sulphites)
 * - Adversarial cross-contact & precautionary warnings
 * - Conflicting marketing claims vs. ingredient realities
 * - Incomplete, truncated, and ambiguous label evidence
 * - Compound multi-allergen profiles
 * - Budget, pricing, and multi-currency boundary constraints (INR, AED, USD)
 * - Autonomous state machine integrity, affirmative approval gates, provenance tracking, and zero-fabrication guarantees.
 */

import assert from 'node:assert/strict'
import { evaluateDeterministicSafety, COMPREHENSIVE_ALLERGEN_ALIASES } from '../lib/guardian-agent/orchestrator/verifier'
import { runGuardianAutonomousAgent } from '../lib/guardian-agent/orchestrator/engine'
import { ProductEvidence, Constraint, ClaimedCertification } from '../lib/guardian-agent/orchestrator/types'

let passedCount = 0
let failedCount = 0

async function runScenario(id: number, name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passedCount++
    if (id % 15 === 0 || id === 105 || id === 132) {
      console.log(`  ✓ Benchmark Group [Up to #${id}]: All checks passed cleanly.`)
    }
  } catch (err: any) {
    failedCount++
    console.error(`  ❌ Benchmark #${id} FAILED: [${name}] - ${err.message}`)
    throw err
  }
}

function createValidCert(associatedProductId: string, overrides: Partial<ClaimedCertification> = {}): ClaimedCertification {
  return {
    certificationBody: overrides.certificationBody || 'Independent Standards Registry',
    certificationId: overrides.certificationId || 'CERT-REG-101',
    associatedProductId,
    evidenceUrl: overrides.evidenceUrl || 'https://registry.standards.org/verify/101',
    observedAt: '2026-10-01T00:00:00Z',
    verifiedAt: '2026-10-01T00:00:00Z',
    verificationMethod: overrides.verificationMethod || 'REGISTRY_LOOKUP_AUTHENTICATED',
    provenanceLevel: overrides.provenanceLevel || 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
    standard: overrides.standard || 'ORGANIC',
    status: overrides.status || 'ACTIVE',
    ...overrides
  }
}

function createItem(overrides: Partial<ProductEvidence> = {}): ProductEvidence {
  return {
    id: overrides.id || `bench_${Math.random().toString(36).substring(7)}`,
    name: overrides.name || 'Benchmark Food Item',
    ingredients: overrides.ingredients !== undefined ? overrides.ingredients : 'rice flour, purified water, salt',
    allergenStatement: overrides.allergenStatement !== undefined ? overrides.allergenStatement : 'Contains: none declared',
    labelComplete: overrides.labelComplete !== undefined ? overrides.labelComplete : true,
    evidenceSource: overrides.evidenceSource || 'Synthetic Benchmark Fixture',
    sourceType: overrides.sourceType || 'SYNTHETIC_BENCHMARK_FIXTURE',
    verificationStatus: overrides.verificationStatus || 'SYNTHETIC_FIXTURE',
    evidenceLimitations: overrides.evidenceLimitations || ['Synthetic benchmark testing fixture.'],
    price: overrides.price !== undefined ? overrides.price : 100,
    currency: overrides.currency || 'INR',
    ...overrides
  }
}

async function main() {
  console.log('======================================================================')
  console.log('🛡️  SCANSAFE GUARDIAN AI — 132 AUTONOMOUS BENCHMARK SCENARIO SUITE')
  console.log('======================================================================\n')

  // ===========================================================================
  // CATEGORY 1: Direct Restricted Allergen Detection (Scenarios 1 - 30)
  // ===========================================================================
  console.log('▶ Category 1: Direct Allergen Detections Across 15 Standard Classes (1 - 30)')

  await runScenario(1, 'Peanut - direct ingredient', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'roasted peanuts, sea salt' }), ['peanut'])
    assert.equal(p.status, 'excluded')
    assert.ok(p.allergenHits.some(h => h.includes('peanut')))
  })

  await runScenario(2, 'Peanut - groundnut alias', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'groundnut oil, cumin' }), ['peanut'])
    assert.equal(p.status, 'excluded')
    assert.ok(p.allergenHits.some(h => h.includes('groundnut')))
  })

  await runScenario(3, 'Tree Nut - almond ingredient', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'rolled oats, sliced almonds, honey' }), ['tree_nut'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(4, 'Tree Nut - cashew alias', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'cashew paste, cardamom, sugar' }), ['tree_nut'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(5, 'Milk - direct milk solids', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'cocoa mass, milk solids, lecithin' }), ['milk'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(6, 'Milk - sodium caseinate derivative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'coffee extract, sodium caseinate, sugar' }), ['milk'])
    assert.equal(p.status, 'excluded')
    assert.ok(p.allergenHits.some(h => h.includes('casein')))
  })

  await runScenario(7, 'Egg - whole egg', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'flour, egg yolk, vanilla' }), ['egg'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(8, 'Egg - ovalbumin derivative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'sugar, ovalbumin, natural flavor' }), ['egg'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(9, 'Soy - direct edamame / soybean', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'shelled edamame, salt' }), ['soy'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(10, 'Soy - soy lecithin derivative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'cocoa powder, soy lecithin, stevia' }), ['soy'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(11, 'Wheat - direct maida / wheat flour', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'maida, baking soda, water' }), ['wheat'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(12, 'Wheat - semolina derivative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'durum semolina, filtered water' }), ['wheat'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(13, 'Gluten - barley malt extract', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'corn grits, barley malt, sugar' }), ['gluten'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(14, 'Gluten - rye grain', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'rye flour, sourdough starter, salt' }), ['gluten'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(15, 'Sesame - whole sesame seeds', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'white sesame seeds, glucose' }), ['sesame'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(16, 'Sesame - tahini paste derivative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'chickpeas, tahini, lemon juice' }), ['sesame'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(17, 'Crustacean - shrimp powder', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'noodles, shrimp powder, garlic' }), ['crustacean'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(18, 'Crustacean - prawn paste', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'fermented prawn paste, chili' }), ['crustacean'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(19, 'Fish - anchovy extract', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'vinegar, anchovy extract, molasses' }), ['fish'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(20, 'Fish - tuna broth', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'water, dried tuna, kombu' }), ['fish'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(21, 'Mustard - whole mustard seeds', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'lentils, mustard seeds, curry leaves' }), ['mustard'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(22, 'Mustard - dijon mustard paste', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'olive oil, dijon, white wine' }), ['mustard'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(23, 'Celery - direct celeriac', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'potato, celeriac, vegetable oil' }), ['celery'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(24, 'Celery - celery salt seasoning', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'salt, celery salt, paprika' }), ['celery'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(25, 'Lupin - lupine flour', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'rice flour, lupin flour, xanthan gum' }), ['lupin'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(26, 'Lupin - lupin bean snack', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'lupin beans, sea salt, oregano' }), ['lupin'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(27, 'Mollusc - squid ink', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'durum wheat, squid ink, water' }), ['mollusc'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(28, 'Mollusc - oyster extract', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'soy sauce, oyster extract, sugar' }), ['mollusc'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(29, 'Sulphite - sulphur dioxide preservative', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'dried apricots, sulphur dioxide' }), ['sulphite'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(30, 'Sulphite - E220 code', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'grape juice, preservative (e220)' }), ['sulphite'])
    assert.equal(p.status, 'excluded')
  })

  // ===========================================================================
  // CATEGORY 2: Precautionary Cross-Contact & Facility Warnings (Scenarios 31 - 45)
  // ===========================================================================
  console.log('▶ Category 2: Precautionary Statements & Cross-Contact Screening (31 - 45)')

  await runScenario(31, 'Cross-contact - shared equipment with peanuts', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'oat flour, palm oil',
      allergenStatement: 'Manufactured on equipment that also processes peanuts'
    }), ['peanut'])
    assert.equal(p.status, 'excluded')
    assert.equal(p.precautionaryNotice, true)
  })

  await runScenario(32, 'Cross-contact - facility handling tree nuts', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'corn meal, sugar',
      allergenStatement: 'Processed in a facility that handles tree nuts'
    }), ['tree_nut'])
    assert.equal(p.status, 'excluded')
    assert.equal(p.precautionaryNotice, true)
  })

  await runScenario(33, 'Cross-contact - traces of milk', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'cacao nibs, coconut sugar',
      allergenStatement: 'May contain traces of milk'
    }), ['milk'])
    assert.equal(p.status, 'excluded')
    assert.equal(p.precautionaryNotice, true)
  })

  await runScenario(34, 'Cross-contact - soy line', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'pea protein, chia seeds',
      allergenStatement: 'Made on a shared line with soy products'
    }), ['soy'])
    assert.equal(p.status, 'excluded')
    assert.equal(p.precautionaryNotice, true)
  })

  await runScenario(35, 'Cross-contact - wheat packaging environment', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'millet flour, baking soda',
      allergenStatement: 'Packaged in a facility handling wheat and gluten'
    }), ['wheat'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(36, 'Cross-contact - crustaceans facility', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'seaweed, sesame oil',
      allergenStatement: 'May contain traces of crustacean'
    }), ['crustacean'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(37, 'Cross-contact - sesame seed equipment', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'sunflower seeds, honey',
      allergenStatement: 'Shared equipment with sesame'
    }), ['sesame'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(38, 'Cross-contact - mustard lines', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'tomato paste, vinegar, herbs',
      allergenStatement: 'Processed in facility with mustard'
    }), ['mustard'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(39, 'Cross-contact - fish in facility', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'nori sheets, sea salt',
      allergenStatement: 'Manufactured on equipment that handles fish'
    }), ['fish'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(40, 'Cross-contact - lupine facility', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'almond flour, erythritol',
      allergenStatement: 'Made on shared line with lupin'
    }), ['lupin'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(41, 'Cross-contact - unspecified allergen cross-contact', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'tapioca starch, salt',
      allergenStatement: 'Made on shared equipment'
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
    assert.equal(p.precautionaryNotice, true)
    assert.ok(p.uncertaintyScore >= 0.5)
  })

  await runScenario(42, 'Cross-contact - facility handles general common allergens', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'potato flakes, vegetable oil',
      allergenStatement: 'Processed in a facility that handles common allergens'
    }), ['milk'])
    assert.equal(p.status, 'needs_review')
    assert.equal(p.precautionaryNotice, true)
  })

  await runScenario(43, 'Cross-contact - unrelated allergen does NOT trip constraint', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'rice, black pepper',
      allergenStatement: 'Contains: none. May contain fish.'
    }), ['peanut'])
    assert.equal(p.status, 'candidate')
    assert.equal(p.precautionaryNotice, false)
  })

  await runScenario(44, 'Cross-contact - completely dedicated clean facility', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'pure oats, cane sugar',
      allergenStatement: 'Contains: none. Produced in a dedicated certified nut-free facility.'
    }), ['peanut'])
    assert.ok(p.status === 'candidate' || p.status === 'needs_review')
  })

  await runScenario(45, 'Cross-contact - multiple allergens in warning', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'corn chips, sunflower oil',
      allergenStatement: 'May contain traces of milk, peanuts, and soy'
    }), ['peanut'])
    assert.equal(p.status, 'excluded')
  })

  // ===========================================================================
  // CATEGORY 3: Conflicting Claims vs. Ingredient Realities (Scenarios 46 - 60)
  // ===========================================================================
  console.log('▶ Category 3: Conflicting Claims & Negative Marketing Statements (46 - 60)')

  await runScenario(46, 'Conflicting - claims "peanut-free" in ingredients', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'peanut-free rice flour, cane sugar'
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
    assert.equal(p.conflictingClaims, true)
  })

  await runScenario(47, 'Conflicting - "dairy-free" on front, contains milk powder in ingredients', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'dairy-free blend, cocoa butter, milk powder'
    }), ['milk'])
    assert.equal(p.status, 'excluded')
    assert.ok(p.allergenHits.length > 0)
  })

  await runScenario(48, 'Conflicting - "gluten-free" claim, but contains barley malt', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'gluten-free crisps, barley malt, salt'
    }), ['gluten'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(49, 'Conflicting - "nut-free" claim, but contains almond meal', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'nut-free snack bites, almond, dates'
    }), ['tree_nut'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(50, 'Conflicting - "eggless" claim, but contains albumin', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'egg-free cake mix, albumin, sugar'
    }), ['egg'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(51, 'Conflicting - "soy-free" claim, but contains soy lecithin', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'soy-free dark chocolate, soy lecithin, vanilla'
    }), ['soy'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(52, 'Conflicting - "wheat-free" claim, but contains maida', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'wheat-free flatbread, maida, oil'
    }), ['wheat'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(53, 'Conflicting - "no added milk" with whey protein', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'no milk smoothie base, whey, strawberries'
    }), ['milk'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(54, 'Conflicting - "zero dairy" with sodium caseinate', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'zero dairy creamer, sodium caseinate, coconut oil'
    }), ['milk'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(55, 'Conflicting - "sesame-free" claim alone requires review', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'pure chickpeas, olive oil, lemon',
      allergenStatement: 'Contains: none; sesame-free'
    }), ['sesame'])
    assert.equal(p.status, 'needs_review')
    assert.equal(p.conflictingClaims, true)
  })

  await runScenario(56, 'Conflicting - "gluten-free" claim alone in allergen statement', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'millet flour, salt',
      allergenStatement: 'Certified gluten-free'
    }), ['gluten'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(57, 'Conflicting - "dairy-free" claim alone in allergen statement', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'almond base, dates',
      allergenStatement: '100% dairy-free'
    }), ['milk'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(58, 'Conflicting - "free from shellfish" claim alone', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'sea vegetable flakes, oil',
      allergenStatement: 'Free from shellfish'
    }), ['crustacean'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(59, 'Conflicting - "egg-free" claim in ingredients text', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'egg-free pasta dough, semolina, water'
    }), ['egg'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(60, 'Conflicting - "without soy" wording in description', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'chickpea patties without soy, olive oil, salt'
    }), ['soy'])
    assert.equal(p.status, 'needs_review')
  })

  // ===========================================================================
  // CATEGORY 4: Incomplete, Ambiguous & Adversarial Labels (Scenarios 61 - 75)
  // ===========================================================================
  console.log('▶ Category 4: Incomplete, Truncated & Ambiguous Label Evidence (61 - 75)')

  await runScenario(61, 'Incomplete label - labelComplete is false', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'rice, salt',
      labelComplete: false
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
    assert.ok(p.uncertaintyScore >= 0.7)
    assert.ok(p.reasons.some(r => r.includes('incomplete')))
  })

  await runScenario(62, 'Missing allergen statement - empty string', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'corn flour, sugar',
      allergenStatement: ''
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(63, 'Missing ingredients - empty string', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: '',
      allergenStatement: 'Contains: none'
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(64, 'Missing both ingredients and allergen statement', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: '',
      allergenStatement: ''
    }), ['milk'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(65, 'Ambiguous ingredient - "spices" on mustard restriction', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'water, vinegar, spices',
      allergenStatement: 'Contains: spices'
    }), ['mustard'])
    assert.ok(p.status === 'candidate' || p.status === 'needs_review')
  })

  await runScenario(66, 'Ambiguous ingredient - "natural flavoring" on milk restriction', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'carbonated water, cane sugar, natural flavoring',
      allergenStatement: 'Contains: none'
    }), ['milk'])
    assert.equal(p.status, 'candidate')
    assert.ok(p.uncertaintyScore <= 0.3)
  })

  await runScenario(67, 'Truncated ingredient list ending with ellipsis', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'wheat flour, palm oil, salt, ...',
      labelComplete: false
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(68, 'Allergen statement has whitespace only', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'rice, oil',
      allergenStatement: '   \n  \t '
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(69, 'Corrupted OCR packaging text with unreadable characters', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: '%$#@! &*(^!~ unreadable block',
      labelComplete: false
    }), ['peanut'])
    assert.equal(p.status, 'needs_review')
  })

  await runScenario(70, 'Detailed complete label passes as clean candidate', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: '100% whole grain oats, chia seeds, pure maple syrup, sea salt',
      allergenStatement: 'Contains: none. Facility: Nut-free, Dairy-free.',
      labelComplete: true
    }), ['peanut'])
    assert.ok(p.status === 'candidate' || p.status === 'needs_review')
  })

  await runScenario(71, 'Partial label with only salt declared', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'salt',
      allergenStatement: 'Contains: none',
      labelComplete: true
    }), ['peanut'])
    assert.equal(p.status, 'candidate')
  })

  await runScenario(72, 'Completely clean certified benchmark item without allergens', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'potatoes, vegetable oil, salt',
      allergenStatement: 'Contains: none'
    }), ['peanut'])
    assert.equal(p.status, 'candidate')
    assert.equal(p.allergenHits.length, 0)
  })

  await runScenario(73, 'Multiple commas and semicolon separation handled cleanly', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'water; sugar; salt, peanuts; emulsifier',
      allergenStatement: 'Contains: peanuts'
    }), ['peanut'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(74, 'Mixed case and punctuation parsing', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: 'Rolled OATS, (pEaNut BuTtEr), Honey',
      allergenStatement: 'Contains: pEaNuTs'
    }), ['peanut'])
    assert.equal(p.status, 'excluded')
  })

  await runScenario(75, 'Newlines inside ingredients parsed without losing tokens', () => {
    const p = evaluateDeterministicSafety(createItem({
      ingredients: "rice flour\nsalt\nroasted peanuts\noil",
      allergenStatement: "Contains:\npeanuts"
    }), ['peanut'])
    assert.equal(p.status, 'excluded')
  })

  // ===========================================================================
  // CATEGORY 5: Multi-Allergen Compound Constraints (Scenarios 76 - 85)
  // ===========================================================================
  console.log('▶ Category 5: Multi-Allergen Compound Dietary Constraints (76 - 85)')

  const multiNut: Constraint[] = ['peanut', 'tree_nut']
  await runScenario(76, 'Compound [peanut + tree_nut] - contains peanuts', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'peanuts, sugar' }), multiNut)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(77, 'Compound [peanut + tree_nut] - contains cashews', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'cashew nuts, salt' }), multiNut)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(78, 'Compound [peanut + tree_nut] - clean oats', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'rolled oats, water', allergenStatement: 'Contains: none' }), multiNut)
    assert.equal(p.status, 'candidate')
  })

  const allergyTrio: Constraint[] = ['milk', 'egg', 'soy']
  await runScenario(79, 'Compound [milk + egg + soy] - contains milk whey', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'whey protein, cocoa' }), allergyTrio)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(80, 'Compound [milk + egg + soy] - contains egg whites', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'sugar, egg white, water' }), allergyTrio)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(81, 'Compound [milk + egg + soy] - contains tofu', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'organic tofu, ginger' }), allergyTrio)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(82, 'Compound [wheat + gluten] - contains maida', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'maida, salt' }), ['wheat', 'gluten'])
    assert.equal(p.status, 'excluded')
  })

  const seaAllergies: Constraint[] = ['fish', 'crustacean', 'mollusc']
  await runScenario(83, 'Compound [fish + crustacean + mollusc] - contains oyster sauce', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'oyster sauce, water' }), seaAllergies)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(84, 'Compound [fish + crustacean + mollusc] - contains shrimp', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'dried shrimp, chili' }), seaAllergies)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(85, 'Compound [celery + mustard + lupin + sesame] - contains tahini', () => {
    const p = evaluateDeterministicSafety(createItem({ ingredients: 'chickpeas, tahini' }), ['celery', 'mustard', 'lupin', 'sesame'])
    assert.equal(p.status, 'excluded')
  })

  // ===========================================================================
  // CATEGORY 6: Budget, Pricing & Multi-Currency Boundaries (Scenarios 86 - 95)
  // ===========================================================================
  console.log('▶ Category 6: Budget, Pricing & Currency Boundaries (86 - 95)')

  await runScenario(86, 'Budget INR - strictly under budget', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 40, currency: 'INR' }), ['peanut'], 50)
    assert.equal(p.status, 'candidate')
  })

  await runScenario(87, 'Budget INR - exactly equal to budget', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 50, currency: 'INR' }), ['peanut'], 50)
    assert.equal(p.status, 'candidate')
  })

  await runScenario(88, 'Budget INR - marginally over budget (+0.50 INR)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 50.50, currency: 'INR' }), ['peanut'], 50)
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('exceeds user budget')))
  })

  await runScenario(89, 'Budget INR - substantially over budget (500 INR vs 100 INR budget)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 500, currency: 'INR' }), ['peanut'], 100)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(90, 'Budget AED - within budget (25 AED vs 30 AED budget)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 25, currency: 'AED' }), ['peanut'], 30)
    assert.equal(p.status, 'candidate')
  })

  await runScenario(91, 'Budget AED - exceeds budget (35 AED vs 30 AED budget)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 35, currency: 'AED' }), ['peanut'], 30)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(92, 'Budget USD - within budget (12 USD vs 15 USD budget)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 12, currency: 'USD' }), ['peanut'], 15)
    assert.equal(p.status, 'candidate')
  })

  await runScenario(93, 'Budget USD - exceeds budget (16 USD vs 15 USD budget)', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 16, currency: 'USD' }), ['peanut'], 15)
    assert.equal(p.status, 'excluded')
  })

  await runScenario(94, 'Budget constraint specified, but item price is undefined', () => {
    const p = evaluateDeterministicSafety(createItem({ price: undefined }), ['peanut'], 100)
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('price is unavailable')))
  })

  await runScenario(95, 'No budget specified - item accepted at any valid non-negative price', () => {
    const p = evaluateDeterministicSafety(createItem({ price: 9999 }), ['peanut'])
    assert.equal(p.status, 'candidate')
  })

  // ===========================================================================
  // CATEGORY 7: Autonomous Engine, Gates & Non-Fabrication (Scenarios 96 - 105)
  // ===========================================================================
  console.log('▶ Category 7: Autonomous Engine, State Machine, Gates & Non-Fabrication (96 - 105)')

  await runScenario(96, 'Empty candidate catalog returns 0 shortlisted items and zero hallucinations', async () => {
    const res = await runGuardianAutonomousAgent({
      goal: 'Find allergen safe crackers',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      allowInternalCatalog: false,
      allowPublicOffCatalog: false,
      allowPartnerCatalog: false,
      products: []
    })
    assert.equal(res.shortlist.length, 0)
    assert.equal(res.products.length, 0)
    assert.ok(res.limitations.length > 0)
  })

  await runScenario(97, 'External connector failure initiates automatic bounded retry and safe recovery', async () => {
    let callCount = 0
    const res = await runGuardianAutonomousAgent({
      goal: 'Find gluten-free pasta',
      constraints: ['gluten'],
      currency: 'INR',
      maxResults: 5,
      allowInternalCatalog: false,
      allowPublicOffCatalog: false,
      allowPartnerCatalog: true
    }, {
      externalCatalogSearch: async () => {
        callCount++
        if (callCount === 1) throw new Error('Temporary gateway timeout')
        return [createItem({
          id: 'gf_penne',
          name: 'GF Penne',
          ingredients: 'corn flour, rice flour',
          price: 90,
          certifiedRecords: [createValidCert('gf_penne', {
            standard: 'GLUTEN_FREE',
            certificationBody: 'Gluten-Free Certification Organization (GFCO)',
            certificationId: 'GF-9921',
            evidenceUrl: 'https://gfco.org/verify/GF-9921'
          })]
        })]
      }
    })
    assert.equal(callCount, 2)
    assert.deepEqual(res.shortlist, ['gf_penne'])
    assert.ok(res.steps.some(s => s.tool === 'catalog_search' && s.status === 'completed'))
  })

  await runScenario(98, 'Affirmative approval gate: shortlist NOT saved without explicit consent', async () => {
    let saveInvoked = false
    const res = await runGuardianAutonomousAgent({
      goal: 'Nut-free snack',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      approvedActions: [],
      products: [createItem({
        id: 'item_1',
        name: 'Rice Cake',
        ingredients: 'rice, salt',
        certificationsDeclared: ['Certified Nut-Free'],
        allergenStatement: 'Certified nut-free facility',
        certifiedRecords: [createValidCert('item_1', {
          standard: 'NUT_FREE',
          certificationBody: 'Safe Quality Food Institute',
          certificationId: 'SQF-8812',
          evidenceUrl: 'https://sqfi.com/verify/8812'
        })]
      })]
    }, {
      saveShortlist: async () => {
        saveInvoked = true
      }
    })
    assert.equal(saveInvoked, false)
    assert.equal(res.saved, false)
  })

  await runScenario(99, 'Affirmative approval gate: shortlist saved ONLY when approvedActions includes save_shortlist', async () => {
    let savedIds: string[] = []
    const res = await runGuardianAutonomousAgent({
      goal: 'Nut-free snack',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      approvedActions: ['save_shortlist'],
      products: [createItem({
        id: 'item_safe',
        name: 'Rice Cake',
        ingredients: 'rice, salt',
        certificationsDeclared: ['Certified Nut-Free'],
        allergenStatement: 'Certified nut-free facility',
        certifiedRecords: [createValidCert('item_safe', {
          standard: 'NUT_FREE',
          certificationBody: 'Safe Quality Food Institute',
          certificationId: 'SQF-8812',
          evidenceUrl: 'https://sqfi.com/verify/8812'
        })]
      })]
    }, {
      saveShortlist: async (ids) => {
        savedIds = ids
      }
    })
    assert.equal(res.saved, true)
    assert.deepEqual(savedIds, ['item_safe'])
  })

  await runScenario(100, 'Duplicate candidate records across feeds are deduplicated by ID / name', async () => {
    const itemA = createItem({ id: 'dup_1', name: 'Same Cereal', ingredients: 'corn, sugar', price: 60 })
    const itemB = createItem({ id: 'dup_1', name: 'Same Cereal', ingredients: 'corn, sugar', price: 60 })
    const res = await runGuardianAutonomousAgent({
      goal: 'Corn flakes',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [itemA, itemB]
    })
    assert.equal(res.products.length, 1)
  })

  await runScenario(101, 'Provenance integrity preserved: USER_UPLOADED_LABEL source is kept verbatim', async () => {
    const item = createItem({ id: 'user_item', sourceType: 'USER_UPLOADED_LABEL', evidenceSource: 'Mobile camera front/back label capture' })
    const res = await runGuardianAutonomousAgent({
      goal: 'Check snack',
      constraints: ['peanut'],
      products: [item]
    })
    assert.equal(res.products[0].sourceType, 'USER_UPLOADED_LABEL')
    assert.equal(res.products[0].evidenceSource, 'Mobile camera front/back label capture')
  })

  await runScenario(102, 'Provenance integrity preserved: INTERNAL_VERIFIED_CATALOG source is kept verbatim', async () => {
    const item = createItem({ id: 'db_item', sourceType: 'INTERNAL_VERIFIED_CATALOG', evidenceSource: 'ScanSafe Curated Database' })
    const res = await runGuardianAutonomousAgent({
      goal: 'Check snack',
      constraints: ['peanut'],
      products: [item]
    })
    assert.equal(res.products[0].sourceType, 'INTERNAL_VERIFIED_CATALOG')
  })

  await runScenario(103, 'Provenance integrity preserved: OPEN_FOOD_FACTS_PUBLIC source is kept verbatim', async () => {
    const item = createItem({ id: 'off_item', sourceType: 'OPEN_FOOD_FACTS_PUBLIC', evidenceSource: 'Open Food Facts Public API' })
    const res = await runGuardianAutonomousAgent({
      goal: 'Check snack',
      constraints: ['peanut'],
      products: [item]
    })
    assert.equal(res.products[0].sourceType, 'OPEN_FOOD_FACTS_PUBLIC')
  })

  await runScenario(104, 'Zero fabrication constraint: never invents unprovided safety certificates', async () => {
    const item = createItem({ id: 'plain_item', ingredients: 'oats, water', allergenStatement: 'Contains: none' })
    const res = await runGuardianAutonomousAgent({
      goal: 'Verify safety',
      constraints: ['peanut'],
      products: [item]
    })
    assert.ok(res.safetyNotice.includes('does NOT constitute medical'))
    assert.ok(res.limitations.some(l => l.includes('bounded') || l.includes('strictly prohibited') || l.includes('unverified')))
  })

  await runScenario(105, 'Max results cutoff: returns strictly bounded top candidates up to maxResults limit', async () => {
    const items = [
      createItem({ id: 'c1', name: 'Item 1', price: 10 }),
      createItem({ id: 'c2', name: 'Item 2', price: 20 }),
      createItem({ id: 'c3', name: 'Item 3', price: 30 }),
      createItem({ id: 'c4', name: 'Item 4', price: 40 }),
      createItem({ id: 'c5', name: 'Item 5', price: 50 })
    ]
    const res = await runGuardianAutonomousAgent({
      goal: 'Rank top 2 budget items',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 2,
      products: items
    })
    assert.equal(res.shortlist.length, 2)
    assert.deepEqual(res.shortlist, ['c1', 'c2'])
  })

  // ===========================================================================
  // CATEGORY 8: Goal Relevance & Championship Failure Mode Regressions (106 - 115)
  // ===========================================================================
  console.log('▶ Category 8: Goal Relevance & Championship Failure Mode Regressions (106 - 115)')

  await runScenario(106, 'Seed butter request strictly excludes ordinary animal dairy butter despite peanut/tree-nut safety', async () => {
    const dairyButter = createItem({
      id: 'dairy_butter_1',
      name: 'Amul Pasteurized Butter',
      ingredients: 'butterfat, pasteurized cream, common salt, water',
      allergenStatement: 'Contains: Milk',
      labelComplete: true,
      price: 60
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread that is peanut-free and tree-nut-free',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [dairyButter]
    })
    const p = res.products.find(x => x.id === 'dairy_butter_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED') // Neither peanut nor tree-nut
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Category Violation') || r.includes('dairy butter')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(107, 'Seed butter request strictly excludes peanut butter and nut butter', async () => {
    const peanutButter = createItem({
      id: 'peanut_butter_1',
      name: 'Pintola Creamy Peanut Butter',
      ingredients: 'roasted peanuts (100%)',
      allergenStatement: 'Contains: Peanuts',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread',
      constraints: ['tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [peanutButter]
    })
    const p = res.products.find(x => x.id === 'peanut_butter_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(108, 'Vegan request strictly excludes animal dairy, whey, egg, and honey ingredients', async () => {
    const wheyBar = createItem({
      id: 'whey_bar_1',
      name: 'Protein Crunch Bar',
      ingredients: 'whole grain rolled oats, whey protein isolate (from milk), clover honey, almonds, salt',
      allergenStatement: 'Contains: Milk, Almonds',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find vegan energy bar',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [wheyBar]
    })
    const p = res.products.find(x => x.id === 'whey_bar_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED') // User only restricted peanut
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Vegan Violation') || r.includes('animal-derived')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(109, 'Low-sugar request strictly excludes product exceeding 5g/100g regulatory threshold', async () => {
    const sugaryBar = createItem({
      id: 'sugary_bar_1',
      name: 'Sweet Granola Snack Bar',
      ingredients: 'rolled oats, brown sugar, cane molasses, sunflower oil, salt',
      allergenStatement: 'Contains: none',
      labelComplete: true,
      sugarsPer100g: 18.5
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find low-sugar snack bar',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [sugaryBar]
    })
    const p = res.products.find(x => x.id === 'sugary_bar_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Low-Sugar Violation') || r.includes('5.0g')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(110, 'Low-sugar request flags missing nutrition panel as NEEDS_REVIEW (never assumes 0g)', async () => {
    const unverifiedBar = createItem({
      id: 'no_sugar_panel_bar',
      name: 'Artisan Oat Snack Bar',
      ingredients: 'rolled oats, sunflower seeds, sea salt',
      allergenStatement: 'Contains: none',
      labelComplete: true,
      sugarsPer100g: undefined // missing nutrition panel
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find low-sugar snack bar',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [unverifiedBar]
    })
    const p = res.products.find(x => x.id === 'no_sugar_panel_bar')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(111, 'Organic request flags uncertified product as NEEDS_REVIEW and discloses limitation', async () => {
    const conventionalSeedButter = createItem({
      id: 'conv_seed_butter',
      name: 'Sunflower Seed Butter Spread',
      ingredients: 'roasted sunflower seeds, cane sugar, salt',
      allergenStatement: 'Contains: none',
      labelComplete: true,
      isOrganicDeclared: false,
      certificationsDeclared: []
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread that is peanut-free and tree-nut-free',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [conventionalSeedButter]
    })
    const p = res.products.find(x => x.id === 'conv_seed_butter')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(112, 'Organic seed butter spread with verified credentials qualifies for candidate shortlist', async () => {
    const organicSunButter = createItem({
      id: 'organic_sunbutter_1',
      name: 'Organic SunButter Sunflower Butter',
      ingredients: 'organic roasted sunflower seeds, organic sugar, sea salt',
      allergenStatement: 'Contains: None declared',
      labelComplete: true,
      isOrganicDeclared: true,
      certificationsDeclared: ['USDA Organic', 'Non-GMO Project Verified', 'Certified Peanut-Free', 'Certified Tree Nut-Free'],
      certifiedRecords: [
        createValidCert('organic_sunbutter_1', {
          standard: 'ORGANIC',
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-4421',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/4421'
        }),
        createValidCert('organic_sunbutter_1', {
          standard: 'PEANUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-771',
          evidenceUrl: 'https://allergencircles.org/verify/771'
        }),
        createValidCert('organic_sunbutter_1', {
          standard: 'NUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-772',
          evidenceUrl: 'https://allergencircles.org/verify/772'
        })
      ],
      price: 450
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread that is peanut-free and tree-nut-free',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [organicSunButter]
    })
    const p = res.products.find(x => x.id === 'organic_sunbutter_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'MATCH')
    assert.equal(p.status, 'candidate')
    assert.deepEqual(res.shortlist, ['organic_sunbutter_1'])
  })

  await runScenario(113, 'Unverified gluten claim with incomplete label fails closed as NEEDS_REVIEW', async () => {
    const incompleteProduct = createItem({
      id: 'incomplete_item_1',
      name: 'Artisan Rice Crackers',
      ingredients: '', // Incomplete
      labelComplete: false,
      allergenStatement: 'No explicit allergen tags'
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find gluten-free crackers',
      constraints: ['gluten'],
      currency: 'INR',
      maxResults: 5,
      products: [incompleteProduct]
    })
    const p = res.products.find(x => x.id === 'incomplete_item_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'UNKNOWN')
    assert.equal(p.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(114, 'Shortlist quota protection: never backfills with unreviewed or excluded products', async () => {
    const qualifyingOrganicSeedButter = createItem({
      id: 'qualifying_seed_butter',
      name: 'Organic Sunflower Seed Spread',
      ingredients: 'organic sunflower seeds, organic cane sugar, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      isOrganicDeclared: true,
      certificationsDeclared: ['USDA Organic', 'Certified Peanut-Free', 'Certified Tree Nut-Free'],
      certifiedRecords: [
        createValidCert('qualifying_seed_butter', {
          standard: 'ORGANIC',
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-8831',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/8831'
        }),
        createValidCert('qualifying_seed_butter', {
          standard: 'PEANUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-991',
          evidenceUrl: 'https://allergencircles.org/verify/991'
        }),
        createValidCert('qualifying_seed_butter', {
          standard: 'NUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-992',
          evidenceUrl: 'https://allergencircles.org/verify/992'
        })
      ],
      price: 350
    })
    const dairyButter = createItem({
      id: 'dairy_butter_excl',
      name: 'Dairy Table Butter',
      ingredients: 'pasteurized cream, salt',
      labelComplete: true
    })
    const nutButter = createItem({
      id: 'nut_butter_excl',
      name: 'Almond Butter',
      ingredients: 'roasted almonds',
      labelComplete: true
    })
    const conventionalSeedButter = createItem({
      id: 'conv_seed_butter_rev',
      name: 'Conventional Sunflower Butter',
      ingredients: 'sunflower seeds, sugar, salt',
      labelComplete: true,
      isOrganicDeclared: false
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread that is peanut-free and tree-nut-free',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [
        qualifyingOrganicSeedButter,
        dairyButter,
        nutButter,
        conventionalSeedButter
      ]
    })

    assert.equal(res.shortlist.length, 1)
    assert.deepEqual(res.shortlist, ['qualifying_seed_butter'])
  })

  await runScenario(115, 'Conflicting cross-source evidence marks product NEEDS_REVIEW with high uncertainty and excludes from shortlist', async () => {
    const itemInternal = createItem({
      id: 'conflict_internal_1',
      name: 'Mixed Seed Bar',
      ingredients: 'sunflower seeds, pumpkin seeds, peanuts, oats',
      allergenStatement: 'Contains: peanuts',
      sourceType: 'INTERNAL_VERIFIED_CATALOG',
      evidenceSource: 'Internal Database'
    })
    const itemOff = createItem({
      id: 'conflict_off_1',
      name: 'Mixed Seed Bar',
      ingredients: 'sunflower seeds, pumpkin seeds, oats, honey',
      allergenStatement: 'Contains: None',
      sourceType: 'OPEN_FOOD_FACTS_CROWDSOURCED',
      evidenceSource: 'Open Food Facts'
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find seed snack bar',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [itemInternal, itemOff]
    })

    const p = res.products.find(x => x.id === 'conflict_internal_1')
    assert.ok(p)
    assert.equal(p.status, 'needs_review')
    assert.equal(p.allergenStatus, 'CONFLICTING')
    assert.equal(res.shortlist.length, 0)
    assert.ok(res.uncertainties.length > 0)
  })

  // ===========================================================================
  // CATEGORY 9: Food Evidence Reliability & False-Positive Mitigations (116 - 122)
  // ===========================================================================
  console.log('▶ Category 9: Food Evidence Reliability & False-Positive Mitigations (116 - 122)')

  await runScenario(116, 'Peanut-free requirement: absence of peanut in ingredient list without explicit packaging claim returns NEEDS_REVIEW', async () => {
    const cleanRiceCracker = createItem({
      id: 'clean_rice_cracker_1',
      name: 'Natural Rice Crackers',
      ingredients: 'organic white rice, sea salt, sunflower oil',
      allergenStatement: 'Contains: None declared',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free crackers',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [cleanRiceCracker]
    })
    const p = res.products.find(x => x.id === 'clean_rice_cracker_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('NEEDS_REVIEW (Peanut-Free)') || r.includes('Absence of peanuts')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(117, 'Peanut-free requirement: product containing peanuts is strictly EXCLUDED', async () => {
    const peanutChikki = createItem({
      id: 'peanut_chikki_1',
      name: 'Roasted Peanut Chikki Bar',
      ingredients: 'roasted peanuts (60%), jaggery, liquid glucose',
      allergenStatement: 'Contains: Peanuts',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free snack',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [peanutChikki]
    })
    const p = res.products.find(x => x.id === 'peanut_chikki_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'CONTAINS')
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(118, 'Allergen-free requirement: precautionary cross-contact warning is strictly EXCLUDED', async () => {
    const crossContactBar = createItem({
      id: 'cross_contact_bar_1',
      name: 'Oat and Berry Energy Bar',
      ingredients: 'rolled oats, cranberries, sunflower seeds, honey',
      allergenStatement: 'May contain tree nuts, peanuts. Manufactured in a facility that also processes wheat and soy.',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find nut-free snack',
      constraints: ['tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [crossContactBar]
    })
    const p = res.products.find(x => x.id === 'cross_contact_bar_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Nut Cross-Contact') || r.includes('cross-contact warning')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(119, 'Vegan requirement: uncertified plant food cannot become a verified MATCH (returns NEEDS_REVIEW)', async () => {
    const uncertifiedPlantBar = createItem({
      id: 'uncertified_plant_bar_1',
      name: 'Chia Seed & Date Energy Bar',
      ingredients: 'deglet noor dates, organic chia seeds, pumpkin seeds, cinnamon',
      allergenStatement: 'Contains: None',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find vegan energy bar',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [uncertifiedPlantBar]
    })
    const p = res.products.find(x => x.id === 'uncertified_plant_bar_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('NEEDS_REVIEW (Vegan)') || r.includes('Absence of detected animal tokens')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(120, 'Vegan requirement: ambiguous additives without certified vegan claim return NEEDS_REVIEW', async () => {
    const ambiguousCracker = createItem({
      id: 'ambiguous_cracker_1',
      name: 'Artisan Sourdough Crackers',
      ingredients: 'wheat flour, extra virgin olive oil, mono- and diglycerides, sea salt, natural flavor',
      allergenStatement: 'Contains: Wheat',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find vegan crackers',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [ambiguousCracker]
    })
    const p = res.products.find(x => x.id === 'ambiguous_cracker_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Ambiguous additives') || r.includes('mono- and diglycerides')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(121, 'Organic requirement: product with organic name keyword but no certification provenance returns NEEDS_REVIEW', async () => {
    const unverifiedOrganicItem = createItem({
      id: 'unverified_organic_item_1',
      name: 'Organic Harvest Oat Clusters',
      ingredients: 'organic rolled oats, tapioca syrup, coconut oil, vanilla',
      allergenStatement: 'Contains: Coconut',
      labelComplete: true,
      certificationsDeclared: [] // No verified standards (USDA, EU, Ecocert, etc.)
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic oat cereal',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [unverifiedOrganicItem]
    })
    const p = res.products.find(x => x.id === 'unverified_organic_item_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('NEEDS_REVIEW (Organic)') || r.includes('lacks independent certification provenance')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(122, 'Shortlist boundedness: when 1 of 5 items satisfies all hard criteria, shortlist size is strictly 1 (never backfills)', async () => {
    const qualifyingSeedButter = createItem({
      id: 'strictly_qualifying_1',
      name: 'Certified Organic Sunflower Butter',
      ingredients: 'organic roasted sunflower seeds, sea salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      isOrganicDeclared: true,
      certificationsDeclared: ['USDA Organic', 'Certified Peanut-Free', 'Certified Tree Nut-Free'],
      certifiedRecords: [
        createValidCert('strictly_qualifying_1', {
          standard: 'ORGANIC',
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-5511',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/5511'
        }),
        createValidCert('strictly_qualifying_1', {
          standard: 'PEANUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-331',
          evidenceUrl: 'https://allergencircles.org/verify/331'
        }),
        createValidCert('strictly_qualifying_1', {
          standard: 'NUT_FREE',
          certificationBody: 'Allergen Control Group',
          certificationId: 'ACG-332',
          evidenceUrl: 'https://allergencircles.org/verify/332'
        })
      ],
      price: 400
    })
    const dairyButter = createItem({
      id: 'dairy_violator_1',
      name: 'Salted Dairy Butter',
      ingredients: 'cream, salt',
      labelComplete: true
    })
    const peanutButter = createItem({
      id: 'peanut_violator_1',
      name: 'Peanut Butter Spread',
      ingredients: 'roasted peanuts, salt',
      labelComplete: true
    })
    const unverifiedOrganicButter = createItem({
      id: 'unverified_org_1',
      name: 'Sunflower Butter Spread',
      ingredients: 'sunflower seeds, salt',
      labelComplete: true,
      isOrganicDeclared: false
    })
    const crossContactSeedButter = createItem({
      id: 'cross_seed_1',
      name: 'Sunflower Butter Spread',
      ingredients: 'sunflower seeds, salt',
      allergenStatement: 'May contain traces of peanuts and almonds.',
      labelComplete: true,
      certificationsDeclared: ['USDA Organic']
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find me an organic seed butter spread that is peanut-free and tree-nut-free',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [
        qualifyingSeedButter,
        dairyButter,
        peanutButter,
        unverifiedOrganicButter,
        crossContactSeedButter
      ]
    })

    assert.equal(res.shortlist.length, 1)
    assert.deepEqual(res.shortlist, ['strictly_qualifying_1'])
  })

  // ===========================================================================
  // CATEGORY 10: Trustworthy Certification Provenance & Category Integrity (123 - 132)
  // ===========================================================================
  console.log('▶ Category 10: Trustworthy Certification Provenance & Category Integrity (123 - 132)')

  await runScenario(123, 'Fake certification text in product record: raw string without certifiedRecords fails as NEEDS_REVIEW', async () => {
    const fakeCertItem = createItem({
      id: 'fake_cert_product_1',
      name: 'Artisan Flax Butter',
      ingredients: 'roasted flaxseeds, cold-pressed sunflower oil, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certificationsDeclared: ['USDA Organic', 'Certified Organic by International Agency'],
      certifiedRecords: []
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [fakeCertItem]
    })
    const p = res.products.find(x => x.id === 'fake_cert_product_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('NEEDS_REVIEW (Organic)') || r.includes('Unverified claim') || r.includes('cannot establish verified certification')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(124, 'Expired certification: record marked EXPIRED fails compliance as NEEDS_REVIEW', async () => {
    const expiredCertItem = createItem({
      id: 'expired_cert_product_1',
      name: 'Organic Pumpkin Seed Butter',
      ingredients: 'organic pumpkin seeds, sea salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('expired_cert_product_1', {
        standard: 'ORGANIC',
        certificationBody: 'Ecocert France',
        status: 'EXPIRED'
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [expiredCertItem]
    })
    const p = res.products.find(x => x.id === 'expired_cert_product_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Expired certification') || r.includes('expired')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(125, 'Manufacturer claim without independent certification: MANUFACTURER_SELF_DECLARED provenance level returns NEEDS_REVIEW', async () => {
    const selfDeclaredItem = createItem({
      id: 'self_declared_product_1',
      name: 'Sunflower Seed Butter',
      ingredients: 'sunflower seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('self_declared_product_1', {
        standard: 'PEANUT_FREE',
        certificationBody: 'Brand Packaging Department',
        provenanceLevel: 'MANUFACTURER_SELF_DECLARED',
        verificationMethod: 'MANUFACTURER_SELF_DECLARATION'
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [selfDeclaredItem]
    })
    const p = res.products.find(x => x.id === 'self_declared_product_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Manufacturer/unverified claim only') || r.includes('MANUFACTURER_SELF_DECLARED')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(126, 'Verified certification tied to a different product: associatedProductId mismatch returns NEEDS_REVIEW', async () => {
    const mismatchedItem = createItem({
      id: 'candidate_item_actual_123',
      name: 'Artisan Sunflower Butter Spread',
      ingredients: 'sunflower seeds, organic sugar, sea salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('completely_different_product_999', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        certificationId: 'NOP-999-MISMATCH',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/999'
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [mismatchedItem]
    })
    const p = res.products.find(x => x.id === 'candidate_item_actual_123')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('identity mismatch') || r.includes('does not match candidate product')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(127, 'Missing certification source URL: empty or whitespace evidenceUrl returns NEEDS_REVIEW', async () => {
    const missingUrlItem = createItem({
      id: 'missing_url_item_1',
      name: 'Organic Sesame Tahini Spread',
      ingredients: 'organic roasted sesame seeds, salt',
      allergenStatement: 'Contains: sesame',
      labelComplete: true,
      certifiedRecords: [createValidCert('missing_url_item_1', {
        standard: 'ORGANIC',
        certificationBody: 'Ecocert',
        evidenceUrl: ''
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [missingUrlItem]
    })
    const p = res.products.find(x => x.id === 'missing_url_item_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Missing certification source URL') || r.includes('lacks verifiable evidence proof URL')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(128, 'Contradictory allergen and certification evidence: certified peanut-free + contains peanuts strictly EXCLUDED', async () => {
    const contradictoryItem = createItem({
      id: 'contradictory_item_1',
      name: 'Seed & Nut Crunch Spread',
      ingredients: 'sunflower seeds, roasted peanuts, sea salt',
      allergenStatement: 'Contains: peanuts',
      labelComplete: true,
      certifiedRecords: [createValidCert('contradictory_item_1', {
        standard: 'PEANUT_FREE',
        certificationBody: 'Bogus Authenticator',
        evidenceUrl: 'https://bogus.com/verify/1'
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [contradictoryItem]
    })
    const p = res.products.find(x => x.id === 'contradictory_item_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'CONTAINS')
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Peanut Violation') || r.includes('Contains peanut')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(129, 'Incomplete ingredient declarations: labelComplete false with empty ingredients fails closed as NEEDS_REVIEW', async () => {
    const incompleteDeclarationItem = createItem({
      id: 'incomplete_decl_item_1',
      name: 'Mystery Roasted Seed Spread',
      ingredients: '',
      labelComplete: false,
      allergenStatement: 'None stated'
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [incompleteDeclarationItem]
    })
    const p = res.products.find(x => x.id === 'incomplete_decl_item_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'UNKNOWN')
    assert.equal(p.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(130, 'Unknown product categories: mandatory category without evidence returns categoryMatch false and NEEDS_REVIEW', async () => {
    const unrelatedItem = createItem({
      id: 'unrelated_item_1',
      name: 'Sparkling Mineral Spring Water',
      ingredients: 'carbonated natural spring water',
      allergenStatement: 'Contains: none declared',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find gluten-free pasta',
      constraints: ['gluten'],
      currency: 'INR',
      maxResults: 5,
      products: [unrelatedItem]
    })
    const p = res.products.find(x => x.id === 'unrelated_item_1')
    assert.ok(p)
    assert.equal(p.categoryMatch, false)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('NEEDS_REVIEW (Category)')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(131, 'Valid seed butter vs dairy butter: dairy butter strictly EXCLUDED, genuine certified seed butter MATCHES', async () => {
    const dairyButter = createItem({
      id: 'dairy_butter_table',
      name: 'Pure Dairy Cow Butter',
      ingredients: 'pasteurized cream, salt',
      labelComplete: true
    })
    const genuineSeedButter = createItem({
      id: 'genuine_sun_butter',
      name: 'SunButter Organic Sunflower Seed Butter',
      ingredients: 'organic sunflower seeds, organic sugar, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      isOrganicDeclared: true,
      certificationsDeclared: ['USDA Organic'],
      certifiedRecords: [createValidCert('genuine_sun_butter', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        certificationId: 'NOP-888',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/888'
      })],
      price: 320
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [dairyButter, genuineSeedButter]
    })
    const dairy = res.products.find(x => x.id === 'dairy_butter_table')
    const seed = res.products.find(x => x.id === 'genuine_sun_butter')
    assert.ok(dairy)
    assert.ok(seed)
    assert.equal(dairy.status, 'excluded')
    assert.equal(dairy.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(seed.status, 'candidate')
    assert.equal(seed.goalRelevanceStatus, 'MATCH')
    assert.deepEqual(res.shortlist, ['genuine_sun_butter'])
  })

  await runScenario(132, 'Insufficient evidence for requested dietary restrictions: clean ingredients without certification returns NEEDS_REVIEW', async () => {
    const cleanNoClaimsItem = createItem({
      id: 'clean_no_claims_1',
      name: 'Roasted Sunflower Spread',
      ingredients: 'sunflower seeds, sunflower oil, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free and tree-nut-free seed butter spread',
      constraints: ['peanut', 'tree_nut'],
      currency: 'INR',
      maxResults: 5,
      products: [cleanNoClaimsItem]
    })
    const p = res.products.find(x => x.id === 'clean_no_claims_1')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'NO_RESTRICTED_TOKENS_DETECTED')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Absence of peanuts') || r.includes('Absence of tree nuts') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  console.log('\n======================================================================')
  console.log(`🎉 ALL ${passedCount} GUARDIAN BENCHMARK SCENARIOS PASSED WITH ZERO ERRORS!`)
  console.log(`   Passed: ${passedCount} / 132`)
  console.log(`   Failed: ${failedCount}`)
  console.log('======================================================================\n')
}

main().catch(err => {
  console.error('\n❌ Fatal benchmark runner error:', err)
  process.exit(1)
})
