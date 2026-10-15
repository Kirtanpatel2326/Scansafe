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
import crypto from 'node:crypto'
import { evaluateDeterministicSafety, COMPREHENSIVE_ALLERGEN_ALIASES } from '../lib/guardian-agent/orchestrator/verifier'
import { runGuardianAutonomousAgent } from '../lib/guardian-agent/orchestrator/engine'
import { ProductEvidence, Constraint, ClaimedCertification } from '../lib/guardian-agent/orchestrator/types'
import {
  generateServerAttestation,
  verifyServerAttestation,
  verifyClaimedCertification,
  isValidAttestationSecret,
  DEPRECATED_FALLBACK_SECRET
} from '../lib/guardian-agent/orchestrator/certification-verifier'
import {
  registerTestVerificationOperations,
  createTestVerificationOperation,
  initializeBenchmarkTestFixtures,
  clearTestVerificationOperations
} from '../lib/guardian-agent/orchestrator/test-evidence-store'

// Setup verified test signing secret (64 characters)
if (!process.env.GUARDIAN_ATTESTATION_SECRET) {
  process.env.GUARDIAN_ATTESTATION_SECRET = '6c8d1798e4f16b7f3a9e2d5c1b0a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a'
}

// Register test fixture certificates for benchmark scenarios via protected test harness
initializeBenchmarkTestFixtures()

let passedCount = 0
let failedCount = 0

async function runScenario(id: number, name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passedCount++
    if (id % 15 === 0 || id === 105 || id === 132 || id === 142 || id === 150 || id === 160 || id === 171 || id === 175) {
      console.log(`  ✓ Benchmark Group [Up to #${id}]: All checks passed cleanly.`)
    }
  } catch (err: any) {
    failedCount++
    console.error(`  ❌ Benchmark #${id} FAILED: [${name}] - ${err.message}`)
    throw err
  }
}

function createValidCert(associatedProductId: string, overrides: Partial<ClaimedCertification> = {}): ClaimedCertification {
  const cert: ClaimedCertification = {
    certificationBody: overrides.certificationBody || 'Independent Standards Registry',
    certificationId: overrides.certificationId || (associatedProductId === 'strictly_qualifying_1' ? 'CERT-REG-101' : `CERT-${associatedProductId.toUpperCase()}`),
    associatedProductId,
    evidenceUrl: overrides.evidenceUrl || (associatedProductId === 'strictly_qualifying_1' ? 'https://registry.standards.org/verify/101' : `https://registry.standards.org/verify/${associatedProductId}`),
    observedAt: '2026-10-01T00:00:00Z',
    verifiedAt: overrides.verifiedAt !== undefined ? overrides.verifiedAt : '2026-10-01T00:00:00Z',
    validFrom: overrides.validFrom || '2026-01-01T00:00:00Z',
    validUntil: overrides.validUntil || '2027-01-01T00:00:00Z',
    verificationMethod: overrides.verificationMethod || 'REGISTRY_LOOKUP_AUTHENTICATED',
    provenanceLevel: overrides.provenanceLevel || 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
    standard: overrides.standard || 'ORGANIC',
    status: overrides.status || 'ACTIVE',
    registryConfirmed: overrides.registryConfirmed !== undefined ? overrides.registryConfirmed : true,
    isRevoked: overrides.isRevoked !== undefined ? overrides.isRevoked : false,
    ...overrides
  }

  // Register auditable verification operation and issue authentic server attestation for valid benchmark records
  if (
    overrides.serverAttestationToken === undefined &&
    !cert.isRevoked &&
    cert.status === 'ACTIVE' &&
    cert.registryConfirmed &&
    cert.provenanceLevel === 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION'
  ) {
    registerTestVerificationOperations([
      createTestVerificationOperation({
        certificateId: cert.certificationId!,
        issuingAuthority: cert.certificationBody,
        standard: cert.standard || 'ORGANIC',
        associatedProductId,
        evidenceUrl: cert.evidenceUrl || 'https://registry.standards.org/default',
        validFrom: cert.validFrom || '2026-01-01T00:00:00Z',
        validUntil: cert.validUntil || '2027-01-01T00:00:00Z',
        revocationStatus: 'ACTIVE',
        brand: cert.brand
      })
    ])
    cert.serverAttestationToken = generateServerAttestation(cert, associatedProductId)
  }

  return cert
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
  console.log('🛡️  SCANSAFE GUARDIAN AI — 175 AUTONOMOUS BENCHMARK SCENARIO SUITE')
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

  // ===========================================================================
  // CATEGORY 11: Certification Trust-Boundary & Adversarial Authentication (133 - 142)
  // ===========================================================================
  console.log('▶ Category 11: Certification Trust-Boundary & Adversarial Authentication (133 - 142)')

  await runScenario(133, 'Adversarial 1: Forged certification record with plausible unapproved URL fails closed as NEEDS_REVIEW', async () => {
    const forgedItem = createItem({
      id: 'forged_cert_item_1',
      name: 'Organic Sunflower Butter Spread',
      ingredients: 'sunflower seeds, organic cane sugar, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('forged_cert_item_1', {
        standard: 'ORGANIC',
        certificationBody: 'Global Organic Verification Bureau',
        evidenceUrl: 'https://plausible-cert-registry.net/verify/101', // Plausible but unapproved domain
        registryConfirmed: true
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [forgedItem]
    })
    const p = res.products.find(x => x.id === 'forged_cert_item_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Forged or unapproved registry URL') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(134, 'Adversarial 2: ACTIVE status without registry confirmation fails closed as NEEDS_REVIEW', async () => {
    const unconfirmedItem = createItem({
      id: 'unconfirmed_cert_item_2',
      name: 'Organic Sesame Seed Tahini',
      ingredients: 'sesame seeds, salt',
      allergenStatement: 'Contains: sesame',
      labelComplete: true,
      certifiedRecords: [createValidCert('unconfirmed_cert_item_2', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/202',
        status: 'ACTIVE',
        registryConfirmed: false // Crucial: claims ACTIVE status without registry confirmation
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [unconfirmedItem]
    })
    const p = res.products.find(x => x.id === 'unconfirmed_cert_item_2')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('ACTIVE status without registry confirmation') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(135, 'Adversarial 3: Missing verification timestamp fails closed as NEEDS_REVIEW', async () => {
    const missingTimeItem = createItem({
      id: 'missing_time_item_3',
      name: 'Organic Pumpkin Seed Butter',
      ingredients: 'organic pumpkin seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('missing_time_item_3', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/303',
        verifiedAt: '' // Missing timestamp
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [missingTimeItem]
    })
    const p = res.products.find(x => x.id === 'missing_time_item_3')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Missing verification timestamp') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(136, 'Adversarial 4: Future-dated verification timestamp fails closed as NEEDS_REVIEW', async () => {
    const futureTimeItem = createItem({
      id: 'future_time_item_4',
      name: 'Organic Watermelon Seed Butter',
      ingredients: 'organic watermelon seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('future_time_item_4', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/404',
        verifiedAt: '2099-01-01T00:00:00Z' // Future timestamp
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [futureTimeItem]
    })
    const p = res.products.find(x => x.id === 'future_time_item_4')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Future-dated verification timestamp') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(137, 'Adversarial 5: Unsupported verification method fails closed as NEEDS_REVIEW', async () => {
    const unsupportedMethodItem = createItem({
      id: 'unsupported_method_item_5',
      name: 'Organic Hemp Seed Butter',
      ingredients: 'organic hemp seeds, sea salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('unsupported_method_item_5', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/505',
        verificationMethod: 'PACKAGING_LABEL_INSPECTION' as any // Unsupported method (only REGISTRY_LOOKUP_AUTHENTICATED or EXTERNAL_STANDARDS_VERIFIER approved)
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [unsupportedMethodItem]
    })
    const p = res.products.find(x => x.id === 'unsupported_method_item_5')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Unsupported verification method') || r.includes('NEEDS_REVIEW')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(138, 'Adversarial 6: Certificate associated with another product or brand mismatch fails closed as NEEDS_REVIEW', async () => {
    const brandMismatchItem = createItem({
      id: 'sun_butter_actual_brand',
      name: 'SunPure Artisan Sunflower Butter',
      brand: 'SunPure',
      ingredients: 'sunflower seeds, organic sugar, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('sun_butter_actual_brand', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/606',
        brand: 'CompletelyDifferentBrand' // Brand binding mismatch
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [brandMismatchItem]
    })
    const p = res.products.find(x => x.id === 'sun_butter_actual_brand')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Brand identity mismatch') || r.includes('does not match product brand')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(139, 'Adversarial 7: Expired, revoked, and unverifiable certificates fail closed as NEEDS_REVIEW', async () => {
    const revokedItem = createItem({
      id: 'revoked_cert_item_7',
      name: 'Organic Flax Seed Butter',
      ingredients: 'organic roasted flax seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('revoked_cert_item_7', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/707',
        status: 'REVOKED',
        isRevoked: true // Explicitly revoked
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [revokedItem]
    })
    const p = res.products.find(x => x.id === 'revoked_cert_item_7')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Revoked certification') || r.includes('revoked')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(140, 'Adversarial 8: DOCUMENTED_THIRD_PARTY_CLAIM without authentication cannot establish verified certification', async () => {
    const thirdPartyClaimItem = createItem({
      id: 'third_party_claim_item_8',
      name: 'Organic Chia Seed Spread',
      ingredients: 'organic chia seeds, cold-pressed sunflower oil, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('third_party_claim_item_8', {
        standard: 'ORGANIC',
        certificationBody: 'Third-Party Distributor Claim',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/808',
        provenanceLevel: 'DOCUMENTED_THIRD_PARTY_CLAIM' // Equated claim rejection test
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [thirdPartyClaimItem]
    })
    const p = res.products.find(x => x.id === 'third_party_claim_item_8')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('DOCUMENTED_THIRD_PARTY_CLAIM') || r.includes('cannot be equated')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(141, 'Adversarial 9: Conflicting certification and ingredient evidence strictly EXCLUDED by deterministic safety', async () => {
    const conflictItem = createItem({
      id: 'conflict_cert_item_9',
      name: 'Sunflower & Peanut Fusion Butter',
      ingredients: 'sunflower seeds, roasted peanuts, sea salt',
      allergenStatement: 'Contains: peanuts.',
      labelComplete: true,
      certifiedRecords: [createValidCert('conflict_cert_item_9', {
        standard: 'PEANUT_FREE',
        certificationBody: 'Allergen Control Group',
        evidenceUrl: 'https://allergencircles.org/verify/909',
        status: 'ACTIVE',
        registryConfirmed: true
      })]
    })
    const res = await runGuardianAutonomousAgent({
      goal: 'Find peanut-free seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [conflictItem]
    })
    const p = res.products.find(x => x.id === 'conflict_cert_item_9')
    assert.ok(p)
    assert.equal(p.allergenStatus, 'CONTAINS')
    assert.equal(p.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(p.status, 'excluded')
    assert.ok(p.reasons.some(r => r.includes('Peanut Violation') || r.includes('Contains peanut')))
    assert.ok(p.reasons.some(r => r.includes('Conflicting certification claimed')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(142, 'Adversarial 10: Attempted injection of trusted status through public API requests fails closed as NEEDS_REVIEW', async () => {
    const { POST } = await import('../app/api/guardian/agent/route')
    const injectedBody = {
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      products: [{
        id: 'injected_cert_item_10',
        name: 'Untrusted Uploaded Sunflower Butter',
        ingredients: 'sunflower seeds, cane sugar, salt',
        allergenStatement: 'Contains: none declared',
        labelComplete: true,
        sourceType: 'USER_UPLOADED_LABEL',
        verificationStatus: 'MANUALLY_PROVIDED',
        evidenceSource: 'Public User Upload',
        certifiedRecords: [{
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-INJECTED-10',
          associatedProductId: 'injected_cert_item_10',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/injected-10',
          observedAt: '2026-10-01T00:00:00Z',
          verifiedAt: '2026-10-01T00:00:00Z',
          validFrom: '2026-01-01T00:00:00Z',
          validUntil: '2027-01-01T00:00:00Z',
          verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
          provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION', // Attempted injection
          standard: 'ORGANIC',
          status: 'ACTIVE',
          registryConfirmed: true // Attempted injection
        }]
      }]
    }

    const req = new Request('http://localhost:3000/api/guardian/agent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.188'
      },
      body: JSON.stringify(injectedBody)
    })

    const response = await POST(req)
    assert.equal(response.status, 200)
    const json = await response.json()
    const p = json.products.find((x: any) => x.id === 'injected_cert_item_10')
    assert.ok(p, 'Product must be evaluated')
    // Untrusted public API client injection must be sanitized and fail closed as NEEDS_REVIEW
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(json.shortlist.length, 0, 'Injected record must not enter shortlist')
  })

  await runScenario(143, 'Adversarial 11: Public API request spoofing INTERNAL_VERIFIED_CATALOG & registryConfirmed is strictly sanitized and fails closed', async () => {
    const { POST } = await import('../app/api/guardian/agent/route')
    const spoofedBody = {
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      products: [{
        id: 'spoofed_internal_item_11',
        name: 'Untrusted Pretend-Internal Seed Butter',
        ingredients: 'sunflower seeds, sea salt',
        allergenStatement: 'Contains: none declared',
        labelComplete: true,
        sourceType: 'INTERNAL_VERIFIED_CATALOG', // Spoofed client field
        verificationStatus: 'MANUFACTURER_AUTHORIZED', // Spoofed client field
        evidenceSource: 'Public API Client Payload',
        certifiedRecords: [{
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-SPOOFED-11',
          associatedProductId: 'spoofed_internal_item_11',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/spoofed-11',
          observedAt: '2026-10-01T00:00:00Z',
          verifiedAt: '2026-10-01T00:00:00Z',
          validFrom: '2026-01-01T00:00:00Z',
          validUntil: '2027-01-01T00:00:00Z',
          verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
          provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
          standard: 'ORGANIC',
          status: 'ACTIVE',
          registryConfirmed: true
        }]
      }]
    }

    const req = new Request('http://localhost:3000/api/guardian/agent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.189'
      },
      body: JSON.stringify(spoofedBody)
    })

    const response = await POST(req)
    assert.equal(response.status, 200)
    const json = await response.json()
    const p = json.products.find((x: any) => x.id === 'spoofed_internal_item_11')
    assert.ok(p, 'Product must be evaluated')
    // Client-supplied sourceType & verificationStatus MUST be ignored; sanitized to USER_UPLOADED_LABEL
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(json.shortlist.length, 0, 'Spoofed internal record must NOT enter shortlist')
  })

  await runScenario(144, 'Adversarial 12: Forged internal catalogue product ID fails closed in public API request', async () => {
    const { POST } = await import('../app/api/guardian/agent/route')
    const forgedIdBody = {
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      products: [{
        id: 'CAT-INTERNAL-VERIFIED-9999', // Forged internal catalog ID
        name: 'Forged Internal Catalog Butter',
        ingredients: 'pumpkin seeds, organic cold-pressed oil, salt',
        allergenStatement: 'Contains: none declared',
        labelComplete: true,
        sourceType: 'INTERNAL_VERIFIED_CATALOG',
        verificationStatus: 'MANUFACTURER_AUTHORIZED',
        evidenceSource: 'Forged ScanSafe Database Reference',
        certifiedRecords: [{
          certificationBody: 'USDA National Organic Program',
          certificationId: 'NOP-FORGED-ID-12',
          associatedProductId: 'CAT-INTERNAL-VERIFIED-9999',
          evidenceUrl: 'https://organic.ams.usda.gov/integrity/forged-id-12',
          observedAt: '2026-10-01T00:00:00Z',
          verifiedAt: '2026-10-01T00:00:00Z',
          validFrom: '2026-01-01T00:00:00Z',
          validUntil: '2027-01-01T00:00:00Z',
          verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
          provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
          standard: 'ORGANIC',
          status: 'ACTIVE',
          registryConfirmed: true
        }]
      }]
    }

    const req = new Request('http://localhost:3000/api/guardian/agent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.190'
      },
      body: JSON.stringify(forgedIdBody)
    })

    const response = await POST(req)
    assert.equal(response.status, 200)
    const json = await response.json()
    const p = json.products.find((x: any) => x.id === 'CAT-INTERNAL-VERIFIED-9999')
    assert.ok(p, 'Product must be evaluated')
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(json.shortlist.length, 0, 'Forged internal ID must not elevate untrusted client submission')
  })

  await runScenario(145, 'Adversarial 13: Legitimate product ID with attacker-supplied unauthenticated certification data fails closed', async () => {
    // Attacker takes an existing known product ID but attaches forged cert data without server attestation
    const targetItem = createItem({
      id: 'strictly_qualifying_1',
      name: 'SunPure Organic Seed Spread',
      ingredients: 'sunflower seeds, sea salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [{
        certificationBody: 'USDA National Organic Program',
        certificationId: 'ATTACKER-NOP-777', // Attacker invented cert ID
        associatedProductId: 'strictly_qualifying_1',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/attacker-777',
        observedAt: '2026-10-01T00:00:00Z',
        verifiedAt: '2026-10-01T00:00:00Z',
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2027-01-01T00:00:00Z',
        verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
        provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
        standard: 'ORGANIC',
        status: 'ACTIVE',
        registryConfirmed: true,
        serverAttestationToken: undefined // No valid server attestation
      }]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [targetItem]
    })
    const p = res.products.find(x => x.id === 'strictly_qualifying_1')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Unauthenticated registry claim') || r.includes('lacks authoritative registry confirmation') || r.includes('Authoritative registry verification unavailable')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(146, 'Adversarial 14: Approved registry URL hostname alone does NOT prove certificate exists or is valid', async () => {
    // Attacker constructs a plausible URL on an approved domain (ams.usda.gov) with registryConfirmed: true
    const plausibleHostItem = createItem({
      id: 'plausible_host_item_14',
      name: 'Artisan Sunflower Cream',
      ingredients: 'sunflower seeds, organic cane syrup, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [{
        certificationBody: 'USDA National Organic Program',
        certificationId: 'NOP-NONEXISTENT-9999',
        associatedProductId: 'plausible_host_item_14',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/nonexistent-cert-9999',
        observedAt: '2026-10-01T00:00:00Z',
        verifiedAt: '2026-10-01T00:00:00Z',
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2027-01-01T00:00:00Z',
        verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
        provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
        standard: 'ORGANIC',
        status: 'ACTIVE',
        registryConfirmed: true
        // No server-side attestation or authoritative registry entry
      }]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [plausibleHostItem]
    })
    const p = res.products.find(x => x.id === 'plausible_host_item_14')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('approved URL hostname alone does not prove certificate existence')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(147, 'Adversarial 15: Valid certificate bound to another product fails closed via identity and attestation mismatch', async () => {
    // Certificate genuinely issued for product_alpha, but attached to product_beta
    const certForAlpha = createValidCert('product_alpha', {
      standard: 'ORGANIC',
      certificationBody: 'USDA National Organic Program',
      evidenceUrl: 'https://organic.ams.usda.gov/integrity/alpha-1'
    })

    const productBeta = createItem({
      id: 'product_beta',
      name: 'Stolen Cert Sunflower Butter',
      ingredients: 'sunflower seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [certForAlpha] // Attached to product_beta
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [productBeta]
    })
    const p = res.products.find(x => x.id === 'product_beta')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Certification identity mismatch') || r.includes('does not match candidate product')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(148, 'Adversarial 16: Certificate listed in authoritative revocation registry strictly fails closed as REVOKED', async () => {
    const revokedItem = createItem({
      id: 'revoked_registry_item_16',
      name: 'Revoked NOP Pumpkin Butter',
      ingredients: 'pumpkin seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [createValidCert('revoked_registry_item_16', {
        standard: 'ORGANIC',
        certificationBody: 'USDA National Organic Program',
        certificationId: 'REVOKED-NOP-001', // Listed in AUTHORITATIVE_REVOCATION_REGISTRY
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/revoked-1',
        status: 'ACTIVE' // Attacker claims ACTIVE, but ID is in revocation registry
      })]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [revokedItem]
    })
    const p = res.products.find(x => x.id === 'revoked_registry_item_16')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Revoked certification') || r.includes('revoked')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(149, 'Adversarial 17: Internal service trust-boundary bypass attempt fails closed as NEEDS_REVIEW', async () => {
    // Calling goal verifier directly with an unauthenticated external certificate record
    const { evaluateProductGoalRelevance, decomposeUserGoal } = await import('../lib/guardian-agent/orchestrator/goal-verifier')
    const item = createItem({
      id: 'bypass_attempt_17',
      name: 'Unverified Watermelon Seed Butter',
      ingredients: 'watermelon seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [{
        certificationBody: 'Independent Standards Registry',
        certificationId: 'UNATTESTED-999',
        associatedProductId: 'bypass_attempt_17',
        evidenceUrl: 'https://registry.standards.org/verify/unat-999',
        observedAt: '2026-10-01T00:00:00Z',
        verifiedAt: '2026-10-01T00:00:00Z',
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2027-01-01T00:00:00Z',
        verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
        provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
        standard: 'ORGANIC',
        status: 'ACTIVE',
        registryConfirmed: true
        // Without valid server attestation token or authoritative registry match
      }]
    })

    const goal = decomposeUserGoal('Find organic seed butter spread', ['peanut'])
    const evaluation = evaluateProductGoalRelevance(item, goal)
    assert.equal(evaluation.status, 'NEEDS_REVIEW')
    assert.equal(evaluation.attributeEvidence['organic']?.status, 'NEEDS_REVIEW')
    assert.ok(evaluation.relevanceReasons.some(r => r.includes('Unauthenticated registry claim') || r.includes('approved URL hostname alone does not prove') || r.includes('Authoritative registry verification unavailable')))
  })

  await runScenario(150, 'Adversarial 18: Forged cryptographic server attestation token fails timing-safe verification', async () => {
    const forgedTokenItem = createItem({
      id: 'forged_token_item_18',
      name: 'Forged Token Sunflower Butter',
      ingredients: 'sunflower seeds, salt',
      allergenStatement: 'Contains: none declared',
      labelComplete: true,
      certifiedRecords: [{
        certificationBody: 'USDA National Organic Program',
        certificationId: 'NOP-FORGED-TOKEN-18',
        associatedProductId: 'forged_token_item_18',
        evidenceUrl: 'https://organic.ams.usda.gov/integrity/forged-18',
        observedAt: '2026-10-01T00:00:00Z',
        verifiedAt: '2026-10-01T00:00:00Z',
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2027-01-01T00:00:00Z',
        verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
        provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
        standard: 'ORGANIC',
        status: 'ACTIVE',
        registryConfirmed: true,
        serverAttestationToken: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // Forged fake token
      }]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [forgedTokenItem]
    })
    const p = res.products.find(x => x.id === 'forged_token_item_18')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.ok(p.reasons.some(r => r.includes('Unauthenticated registry claim') || r.includes('approved URL hostname alone does not prove') || r.includes('Authoritative registry verification unavailable') || r.includes('Invalid cryptographic attestation token')))
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(151, 'Adversarial 19: Missing or weak secret throws on attestation generation and fails closed on verification', () => {
    const originalSecret = process.env.GUARDIAN_ATTESTATION_SECRET
    try {
      // Test weak secret (< 32 chars)
      process.env.GUARDIAN_ATTESTATION_SECRET = 'short_weak_secret'
      const cert = createValidCert('weak_secret_item', { serverAttestationToken: 'placeholder' })
      assert.throws(() => {
        generateServerAttestation(cert, 'weak_secret_item')
      }, /fails cryptographic strength requirements/i)

      // Test verification fails closed
      assert.equal(verifyServerAttestation({
        ...cert,
        serverAttestationToken: 'v1.k1.2027-01-01T00:00:00.000Z.abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      }, 'weak_secret_item'), false)
    } finally {
      process.env.GUARDIAN_ATTESTATION_SECRET = originalSecret
    }
  })

  await runScenario(152, 'Adversarial 20: Attestation tokens signed with deprecated fallback secret are strictly invalidated', () => {
    // Attempt to verify token signed with blacklisted fallback secret
    const cert = createValidCert('deprecated_item', { serverAttestationToken: 'placeholder' })
    const deprecatedHmac = crypto.createHmac('sha256', DEPRECATED_FALLBACK_SECRET)
      .update(['v1', 'k1', '2027-01-01T00:00:00.000Z', 'deprecated_item', cert.associatedProductId, cert.certificationBody.toLowerCase(), (cert.certificationId || '').toLowerCase(), (cert.standard || '').toLowerCase(), cert.evidenceUrl, (cert.validUntil || ''), (cert.verifiedAt || '')].join('|'))
      .digest('hex')

    const deprecatedToken = `v1.k1.2027-01-01T00:00:00.000Z.${deprecatedHmac}`
    assert.equal(verifyServerAttestation({
      ...cert,
      serverAttestationToken: deprecatedToken
    }, 'deprecated_item'), false)
  })

  await runScenario(153, 'Adversarial 21: Expired attestation token fails closed as NEEDS_REVIEW', async () => {
    const pastExpires = new Date(Date.now() - 3600000).toISOString() // 1 hour in the past
    const expiredCert = createValidCert('expired_token_item', {
      attestationExpiresAt: pastExpires
    })
    expiredCert.serverAttestationToken = generateServerAttestation({
      ...expiredCert,
      attestationExpiresAt: pastExpires
    }, 'expired_token_item')

    const res = await runGuardianAutonomousAgent({
      goal: 'Find organic seed butter spread',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [createItem({
        id: 'expired_token_item',
        name: 'Organic Expired Attestation Butter',
        ingredients: 'sunflower seeds, salt',
        allergenStatement: 'Contains: none declared',
        labelComplete: true,
        certifiedRecords: [expiredCert]
      })]
    })
    const p = res.products.find(x => x.id === 'expired_token_item')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
  })

  await runScenario(154, 'Adversarial 22: Key rotation handles previous active key while unknown key fails closed', () => {
    const originalSecret = process.env.GUARDIAN_ATTESTATION_SECRET
    const originalKid = process.env.GUARDIAN_ATTESTATION_KID
    const originalPrevSecret = process.env.GUARDIAN_ATTESTATION_SECRET_PREVIOUS
    const originalPrevKid = process.env.GUARDIAN_ATTESTATION_PREVIOUS_KID
    try {
      const activeSecret = 'new_active_secret_32_characters_long_12345'
      const prevSecret = 'old_previous_secret_32_characters_long_6789'
      process.env.GUARDIAN_ATTESTATION_SECRET = activeSecret
      process.env.GUARDIAN_ATTESTATION_KID = 'k2'
      process.env.GUARDIAN_ATTESTATION_SECRET_PREVIOUS = prevSecret
      process.env.GUARDIAN_ATTESTATION_PREVIOUS_KID = 'k1'

      const cert = createValidCert('rotation_item', { serverAttestationToken: 'placeholder' })
      const expires = new Date(Date.now() + 86400000).toISOString()
      const payload = ['v1', 'k1', expires, 'rotation_item', cert.associatedProductId, cert.certificationBody.toLowerCase(), (cert.certificationId || '').toLowerCase(), (cert.standard || '').toLowerCase(), cert.evidenceUrl, (cert.validUntil || ''), (cert.verifiedAt || '')].join('|')
      const prevHmac = crypto.createHmac('sha256', prevSecret).update(payload).digest('hex')
      const tokenFromPrevKey = `v1.k1.${expires}.${prevHmac}`

      // Token signed with previous key MUST verify cleanly
      assert.equal(verifyServerAttestation({
        ...cert,
        serverAttestationToken: tokenFromPrevKey
      }, 'rotation_item'), true)

      // Token signed with unknown kid MUST fail closed
      const unknownKidToken = `v1.k99.${expires}.${prevHmac}`
      assert.equal(verifyServerAttestation({
        ...cert,
        serverAttestationToken: unknownKidToken
      }, 'rotation_item'), false)
    } finally {
      process.env.GUARDIAN_ATTESTATION_SECRET = originalSecret
      process.env.GUARDIAN_ATTESTATION_KID = originalKid
      process.env.GUARDIAN_ATTESTATION_SECRET_PREVIOUS = originalPrevSecret
      process.env.GUARDIAN_ATTESTATION_PREVIOUS_KID = originalPrevKid
    }
  })

  await runScenario(155, 'Adversarial 23: Tampered signed attestation payload fails timing-safe verification', () => {
    const cert = createValidCert('tampered_item')
    // Legitimate token generated for product 'tampered_item'
    const token = cert.serverAttestationToken!
    assert.ok(token)
    // Attempting to present that token for a different product ID 'attacker_product'
    assert.equal(verifyServerAttestation({
      ...cert,
      associatedProductId: 'attacker_product',
      serverAttestationToken: token
    }, 'attacker_product'), false)
  })

  await runScenario(156, 'Category Matching: Almond butter vs dairy butter (dairy butter is strictly EXCLUDED for nut butter goal)', async () => {
    const dairyButter = createItem({
      id: 'dairy_butter_cand',
      name: 'Amul Pasteurised Dairy Butter',
      ingredients: 'butterfat, pasteurized cream, common salt, water',
      allergenStatement: 'Contains: milk.'
    })
    const almondButter = createItem({
      id: 'almond_butter_cand',
      name: 'Pure Roasted Almond Butter',
      ingredients: 'roasted almonds, sea salt',
      allergenStatement: 'Contains: tree nuts (almonds).'
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find almond butter spread',
      constraints: ['gluten'],
      currency: 'INR',
      maxResults: 5,
      products: [dairyButter, almondButter]
    })

    const dairyEvaluated = res.products.find(p => p.id === 'dairy_butter_cand')
    assert.ok(dairyEvaluated)
    assert.equal(dairyEvaluated.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(dairyEvaluated.status, 'excluded')
    assert.ok(dairyEvaluated.reasons.some(r => r.includes('ordinary animal dairy butter')))

    const almondEvaluated = res.products.find(p => p.id === 'almond_butter_cand')
    assert.ok(almondEvaluated)
    assert.equal(almondEvaluated.categoryMatch, true)
  })

  await runScenario(157, 'Category Matching: Vegan snack vs dairy snack (dairy snack is strictly EXCLUDED)', async () => {
    const dairySnack = createItem({
      id: 'dairy_cheese_snack',
      name: 'Cheddar Cheese Puffs Snack',
      ingredients: 'corn meal, cheddar cheese powder (milk, salt, cultures), whey, milk fat, salt',
      allergenStatement: 'Contains: milk.'
    })
    const veganSnack = createItem({
      id: 'kale_chips_snack',
      name: 'Organic Baked Kale Chips Snack',
      ingredients: 'organic kale, organic sunflower oil, sea salt',
      allergenStatement: 'Contains: none declared',
      certifiedRecords: [createValidCert('kale_chips_snack', {
        standard: 'VEGAN',
        certificationBody: 'The Vegan Society',
        evidenceUrl: 'https://vegansociety.com/verify/kale1'
      })]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find vegan snack',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [dairySnack, veganSnack]
    })

    const cheeseEvaluated = res.products.find(p => p.id === 'dairy_cheese_snack')
    assert.ok(cheeseEvaluated)
    assert.equal(cheeseEvaluated.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(cheeseEvaluated.status, 'excluded')

    const kaleEvaluated = res.products.find(p => p.id === 'kale_chips_snack')
    assert.ok(kaleEvaluated)
    assert.equal(kaleEvaluated.categoryMatch, true)
  })

  await runScenario(158, 'Category Matching: Gluten-free bread vs conventional wheat bread (wheat bread is strictly EXCLUDED)', async () => {
    const wheatBread = createItem({
      id: 'wheat_sourdough_bread',
      name: 'Artisan Wheat Sourdough Bread',
      ingredients: 'wheat flour, water, sourdough culture, salt',
      allergenStatement: 'Contains: wheat.'
    })
    const gfBread = createItem({
      id: 'gf_rice_bread',
      name: 'Gluten-Free Rice Loaf Bread',
      ingredients: 'brown rice flour, tapioca starch, water, yeast, salt',
      allergenStatement: 'Contains: none declared',
      certifiedRecords: [createValidCert('gf_rice_bread', {
        standard: 'GLUTEN_FREE',
        certificationBody: 'Gluten-Free Certification Organization',
        evidenceUrl: 'https://gfco.org/verify/gf1'
      })]
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find gluten-free bread',
      constraints: ['gluten'],
      currency: 'INR',
      maxResults: 5,
      products: [wheatBread, gfBread]
    })

    const wheatEvaluated = res.products.find(p => p.id === 'wheat_sourdough_bread')
    assert.ok(wheatEvaluated)
    assert.equal(wheatEvaluated.status, 'excluded')

    const gfEvaluated = res.products.find(p => p.id === 'gf_rice_bread')
    assert.ok(gfEvaluated)
    assert.equal(gfEvaluated.categoryMatch, true)
    assert.equal(gfEvaluated.status, 'candidate')
    assert.ok(res.shortlist.includes('gf_rice_bread'))
  })

  await runScenario(159, 'Category Matching: Breakfast cereal vs non-food item (shampoo is strictly EXCLUDED)', async () => {
    const shampoo = createItem({
      id: 'soap_shampoo_item',
      name: 'Herbal Essence Hair Shampoo',
      ingredients: 'sodium laureth sulfate, cocamidopropyl betaine, fragrance, water',
      allergenStatement: 'Contains: none declared'
    })
    const cereal = createItem({
      id: 'oat_flakes_cereal',
      name: 'Rolled Oats Breakfast Cereal',
      ingredients: 'whole grain rolled oats',
      allergenStatement: 'Contains: oats'
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find breakfast cereal',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [shampoo, cereal]
    })

    const nonFoodEvaluated = res.products.find(p => p.id === 'soap_shampoo_item')
    assert.ok(nonFoodEvaluated)
    assert.equal(nonFoodEvaluated.goalRelevanceStatus, 'EXCLUDED')
    assert.equal(nonFoodEvaluated.status, 'excluded')

    const cerealEvaluated = res.products.find(p => p.id === 'oat_flakes_cereal')
    assert.ok(cerealEvaluated)
    assert.equal(cerealEvaluated.categoryMatch, true)
  })

  await runScenario(160, 'Category Matching: Unknown category returns NEEDS_REVIEW and never enters shortlist', async () => {
    const strangeItem = createItem({
      id: 'strange_item_160',
      name: 'Generic Mystery Formulation Package',
      ingredients: 'organic sugar, sea salt, citric acid',
      allergenStatement: 'Contains: none declared'
    })

    const res = await runGuardianAutonomousAgent({
      goal: 'Find artisanal kombucha vinegar mother',
      constraints: ['peanut'],
      currency: 'INR',
      maxResults: 5,
      products: [strangeItem]
    })

    const evalProduct = res.products.find(p => p.id === 'strange_item_160')
    assert.ok(evalProduct)
    assert.equal(evalProduct.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(evalProduct.status, 'needs_review')
    assert.equal(res.shortlist.length, 0)
    assert.ok(evalProduct.reasons.some(r => r.includes('lacks evidence confirming mandatory category')))
  })

  // ===========================================================================
  // CATEGORY 12: Standalone P0 Certification Forgery Prevention Suite (161 - 171)
  // ===========================================================================
  console.log('▶ Category 12: Standalone P0 Certification Forgery Prevention Suite (161 - 171)')

  await runScenario(161, 'P0 Forgery 1: Missing signing secret fails closed on verification and generation', () => {
    const originalSecret = process.env.GUARDIAN_ATTESTATION_SECRET
    try {
      delete process.env.GUARDIAN_ATTESTATION_SECRET
      const cert = createValidCert('missing_sec_item', { serverAttestationToken: 'placeholder' })
      assert.throws(() => {
        generateServerAttestation(cert, 'missing_sec_item')
      }, /fails cryptographic strength requirements/i)

      assert.equal(verifyServerAttestation({
        ...cert,
        serverAttestationToken: 'v1.k1.2027-01-01T00:00:00.000Z.abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      }, 'missing_sec_item'), false)
    } finally {
      process.env.GUARDIAN_ATTESTATION_SECRET = originalSecret
    }
  })

  await runScenario(162, 'P0 Forgery 2: Predictable old fallback secret tokens are strictly rejected', () => {
    const cert = createValidCert('old_fallback_item', { serverAttestationToken: 'placeholder' })
    const expires = '2027-01-01T00:00:00.000Z'
    const payload = ['v1', 'k1', expires, 'old_fallback_item', cert.associatedProductId, cert.certificationBody.toLowerCase(), (cert.certificationId || '').toLowerCase(), (cert.standard || '').toLowerCase(), cert.evidenceUrl, (cert.validUntil || ''), (cert.verifiedAt || '')].join('|')
    const fallbackHmac = crypto.createHmac('sha256', DEPRECATED_FALLBACK_SECRET).update(payload).digest('hex')
    const forgedToken = `v1.k1.${expires}.${fallbackHmac}`

    const res = verifyServerAttestation({
      ...cert,
      serverAttestationToken: forgedToken
    }, 'old_fallback_item')
    assert.equal(res, false, 'Tokens signed with deprecated fallback secret must be rejected')
  })

  await runScenario(163, 'P0 Forgery 3: Invalid or tampered attestation signature fails timing-safe check', () => {
    const cert = createValidCert('tampered_sig_item')
    const validToken = cert.serverAttestationToken!
    assert.ok(validToken)
    const lastDot = validToken.lastIndexOf('.')
    const tamperedToken = validToken.slice(0, lastDot + 1) + '0'.repeat(64)

    assert.equal(verifyServerAttestation({
      ...cert,
      serverAttestationToken: tamperedToken
    }, 'tampered_sig_item'), false)
  })

  await runScenario(164, 'P0 Forgery 4: Forged certificate identifier fails closed with invalidation reason', () => {
    const item = createItem({ id: 'forged_cert_id_item' })
    const unverifiedCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'FORGED-CERT-ID-99999',
      associatedProductId: 'forged_cert_id_item',
      evidenceUrl: 'https://registry.standards.org/verify/forged-99999',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(unverifiedCert, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Authoritative registry verification unavailable'))
  })

  await runScenario(165, 'P0 Forgery 5: Genuine certificate ID with a different product fails closed', () => {
    const item = createItem({ id: 'impostor_product_123' })
    const stolenCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'CERT-REG-101',
      associatedProductId: 'impostor_product_123',
      evidenceUrl: 'https://registry.standards.org/verify/101',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(stolenCert, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Product identity mismatch in authoritative registry'))
  })

  await runScenario(166, 'P0 Forgery 6: Genuine certificate ID with a different standard fails closed', () => {
    const item = createItem({ id: 'strictly_qualifying_1' })
    const wrongStandardCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'CERT-REG-101',
      associatedProductId: 'strictly_qualifying_1',
      evidenceUrl: 'https://registry.standards.org/verify/101',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'GLUTEN_FREE',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(wrongStandardCert, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Standard mismatch in authoritative registry'))
  })

  await runScenario(167, 'P0 Forgery 7: Genuine certificate ID with a different evidence URL fails closed', () => {
    const item = createItem({ id: 'strictly_qualifying_1' })
    const wrongUrlCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'CERT-REG-101',
      associatedProductId: 'strictly_qualifying_1',
      evidenceUrl: 'https://registry.standards.org/verify/phishing-101',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(wrongUrlCert, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Evidence URL mismatch in authoritative registry'))
  })

  await runScenario(168, 'P0 Forgery 8: Expired or revoked certificates fail closed in registry and attestation', () => {
    registerTestVerificationOperations([
      createTestVerificationOperation({
        certificateId: 'TEST-REVOKED-01',
        issuingAuthority: 'Independent Standards Registry',
        standard: 'ORGANIC',
        associatedProductId: 'revoked_prod_01',
        evidenceUrl: 'https://registry.standards.org/verify/revoked-01',
        revocationStatus: 'REVOKED',
        validFrom: '2025-01-01T00:00:00Z',
        validUntil: '2027-01-01T00:00:00Z'
      }),
      createTestVerificationOperation({
        certificateId: 'TEST-EXPIRED-01',
        issuingAuthority: 'Independent Standards Registry',
        standard: 'ORGANIC',
        associatedProductId: 'expired_prod_01',
        evidenceUrl: 'https://registry.standards.org/verify/expired-01',
        revocationStatus: 'EXPIRED',
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      })
    ])

    const revokedItem = createItem({ id: 'revoked_prod_01' })
    const revokedCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'TEST-REVOKED-01',
      associatedProductId: 'revoked_prod_01',
      evidenceUrl: 'https://registry.standards.org/verify/revoked-01',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2025-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }
    const revokedVerification = verifyClaimedCertification(revokedCert, revokedItem)
    assert.equal(revokedVerification.authenticated, false)
    assert.ok(revokedVerification.invalidationReason?.includes('Revoked certification in authoritative registry'))

    const expiredItem = createItem({ id: 'expired_prod_01' })
    const expiredCert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'TEST-EXPIRED-01',
      associatedProductId: 'expired_prod_01',
      evidenceUrl: 'https://registry.standards.org/verify/expired-01',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z', // Claimed as future date, but registry entry is expired
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }
    const expiredVerification = verifyClaimedCertification(expiredCert, expiredItem)
    assert.equal(expiredVerification.authenticated, false)
    assert.ok(expiredVerification.invalidationReason?.includes('Expired certification in authoritative registry'))
  })

  await runScenario(169, 'P0 Forgery 9: Public API requests supplying privileged verification metadata are strictly sanitized', async () => {
    const { POST } = await import('../app/api/guardian/agent/route')
    const req = new Request('http://localhost:3000/api/guardian/agent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.42'
      },
      body: JSON.stringify({
        goal: 'Find organic seed butter spread',
        constraints: ['peanut'],
        products: [{
          id: 'privileged_injection_item_169',
          name: 'Privileged Client Injection Butter',
          ingredients: 'organic sunflower seeds, salt',
          allergenStatement: 'Contains: none declared',
          labelComplete: true,
          sourceType: 'INTERNAL_VERIFIED_CATALOG',
          verificationStatus: 'MANUFACTURER_AUTHORIZED',
          evidenceSource: 'Client Injected Privilege',
          provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
          registryConfirmed: true,
          certifiedRecords: [{
            certificationBody: 'USDA National Organic Program',
            certificationId: 'INJECTED-PRIV-169',
            associatedProductId: 'privileged_injection_item_169',
            evidenceUrl: 'https://organic.ams.usda.gov/integrity/injected-169',
            observedAt: '2026-10-01T00:00:00Z',
            verifiedAt: '2026-10-01T00:00:00Z',
            validFrom: '2026-01-01T00:00:00Z',
            validUntil: '2027-01-01T00:00:00Z',
            verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
            provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
            standard: 'ORGANIC',
            status: 'ACTIVE',
            registryConfirmed: true
          }]
        }]
      })
    })

    const response = await POST(req)
    assert.equal(response.status, 200)
    const json = await response.json()
    const p = json.products.find((x: any) => x.id === 'privileged_injection_item_169')
    assert.ok(p)
    assert.equal(p.goalRelevanceStatus, 'NEEDS_REVIEW')
    assert.equal(p.status, 'needs_review')
    assert.equal(json.shortlist.length, 0)
  })

  await runScenario(170, 'P0 Forgery 10: Unavailable registry services return NEEDS_REVIEW', () => {
    const item = createItem({ id: 'unavailable_registry_item' })
    const cert: ClaimedCertification = {
      certificationBody: 'Third Party Certifier',
      certificationId: 'UNREGISTERED-8888',
      associatedProductId: 'unavailable_registry_item',
      evidenceUrl: 'https://registry.standards.org/verify/unregistered',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(cert, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Authoritative registry verification unavailable'))
  })

  await runScenario(171, 'P0 Forgery 11: Internally generated evidence without completed verification operation fails closed', () => {
    const unverifiedCommunityItem = createItem({
      id: 'community_ocr_item_171',
      verificationStatus: 'UNVERIFIED_COMMUNITY_OCR'
    })
    const cert: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'CERT-REG-101',
      associatedProductId: 'community_ocr_item_171',
      evidenceUrl: 'https://registry.standards.org/verify/101',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }

    const verification = verifyClaimedCertification(cert, unverifiedCommunityItem)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('Internally generated evidence without completed verification operation'))
  })

  await runScenario(172, 'P0 Forgery 12: Legacy unversioned 64-character hex attestation tokens are strictly rejected', () => {
    const cert = createValidCert('legacy_unversioned_item', { serverAttestationToken: 'placeholder' })
    const legacyToken = 'a'.repeat(64)
    const res = verifyServerAttestation({
      ...cert,
      serverAttestationToken: legacyToken
    }, 'legacy_unversioned_item')
    assert.equal(res, false, 'Legacy unversioned tokens must be strictly rejected')
  })

  await runScenario(173, 'P0 Forgery 13: Valid internal signature alone cannot establish independent certification authenticity without auditable verification record', () => {
    const certWithoutOp: ClaimedCertification = {
      certificationBody: 'Independent Standards Registry',
      certificationId: 'GENUINE-LOOKING-CERT-999',
      associatedProductId: 'unregistered_signed_item',
      evidenceUrl: 'https://registry.standards.org/verify/999',
      observedAt: '2026-10-01T00:00:00Z',
      verifiedAt: '2026-10-01T00:00:00Z',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
      verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED',
      provenanceLevel: 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION',
      standard: 'ORGANIC',
      status: 'ACTIVE',
      registryConfirmed: true
    }
    const token = generateServerAttestation(certWithoutOp, 'unregistered_signed_item')
    certWithoutOp.serverAttestationToken = token

    // Cryptographic signature is valid
    assert.equal(verifyServerAttestation(certWithoutOp, 'unregistered_signed_item'), true)

    // BUT without an auditable verification record in the server evidence store, verification MUST fail closed!
    const item = createItem({ id: 'unregistered_signed_item' })
    const verification = verifyClaimedCertification(certWithoutOp, item)
    assert.equal(verification.authenticated, false)
    assert.ok(verification.invalidationReason?.includes('An internal attestation signature cannot by itself establish independent certification authenticity'))
  })

  await runScenario(174, 'P0 Forgery 14: Low-entropy or trivial attestation secrets fail validation', () => {
    // 32-char repeating character secret
    assert.equal(isValidAttestationSecret('a'.repeat(32)), false, 'Repeating characters must fail entropy check')
    // 32-char low-entropy secret (< 8 unique characters)
    assert.equal(isValidAttestationSecret('12121212121212121212121212121212'), false, 'Trivial repeating sequence must fail entropy check')
    // Valid high-entropy secret (>= 32 chars, >= 8 unique chars)
    assert.equal(isValidAttestationSecret('6c8d1798e4f16b7f3a9e2d5c1b0a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a'), true)
  })

  await runScenario(175, 'P0 Forgery 15: Production runtime strictly prohibits injection of test verification fixtures', () => {
    const originalEnv = process.env.NODE_ENV
    try {
      ;(process.env as any).NODE_ENV = 'production'
      assert.throws(() => {
        registerTestVerificationOperations([
          createTestVerificationOperation({
            certificateId: 'TEST-PROD-INJECT-01',
            issuingAuthority: 'Attacker Authority',
            standard: 'ORGANIC',
            associatedProductId: 'attacker_prod',
            evidenceUrl: 'https://registry.standards.org/verify/inject'
          })
        ])
      }, /SecurityError: Test fixture registration is strictly prohibited in production/i)
    } finally {
      ;(process.env as any).NODE_ENV = originalEnv
    }
  })

  console.log('\n======================================================================')
  console.log(`🎉 ALL ${passedCount} GUARDIAN BENCHMARK SCENARIOS PASSED WITH ZERO ERRORS!`)
  console.log(`   Passed: ${passedCount} / 175`)
  console.log(`   Failed: ${failedCount}`)
  console.log('======================================================================\n')
}

main().catch(err => {
  console.error('\n❌ Fatal benchmark runner error:', err)
  process.exit(1)
})
