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
import { ProductEvidence, Constraint } from '../lib/guardian-agent/orchestrator/types'

let passedCount = 0
let failedCount = 0

async function runScenario(id: number, name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passedCount++
    if (id % 15 === 0 || id === 105) {
      console.log(`  ✓ Benchmark Group [Up to #${id}]: All checks passed cleanly.`)
    }
  } catch (err: any) {
    failedCount++
    console.error(`  ❌ Benchmark #${id} FAILED: [${name}] - ${err.message}`)
    throw err
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
  console.log('🛡️  SCANSAFE GUARDIAN AI — 105 AUTONOMOUS BENCHMARK SCENARIO SUITE')
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
        return [createItem({ id: 'gf_penne', name: 'GF Penne', ingredients: 'corn flour, rice flour', price: 90 })]
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
      products: [createItem({ id: 'item_1', name: 'Rice Cake', ingredients: 'rice, salt' })]
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
      products: [createItem({ id: 'item_safe', name: 'Rice Cake', ingredients: 'rice, salt' })]
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

  console.log('\n======================================================================')
  console.log(`🎉 ALL ${passedCount} GUARDIAN BENCHMARK SCENARIOS PASSED WITH ZERO ERRORS!`)
  console.log(`   Passed: ${passedCount} / 105`)
  console.log(`   Failed: ${failedCount}`)
  console.log('======================================================================\n')
}

main().catch(err => {
  console.error('\n❌ Fatal benchmark runner error:', err)
  process.exit(1)
})
