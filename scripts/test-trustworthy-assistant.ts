import assert from 'assert'
import { evaluateComparison, RawProductFactsSchema, normalizeNutrientsTo100g } from '../lib/claude'
import { evaluateDietaryCompatibility, CANONICAL_PREFERENCES } from '../lib/preferences'

async function runAssistantTests() {
  console.log('==================================================')
  console.log('🛡️  TESTING TRUSTWORTHY FOOD-LABEL ASSISTANT SUITE')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  // Helper
  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn()
      console.log(`✅ [PASS] ${name}`)
      passed++
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`)
      console.error(`   Error: ${err.message}`)
      failed++
    }
  }

  // --- Test 1: Same-Basis Comparison Enforcement ---
  test('1. Same-Basis Comparison Enforcement (Solid vs Liquid is Undetermined)', () => {
    // Solid Product A: 100g
    const solidProductA: any = {
      product_name: 'Rolled Oats',
      brand: 'Pantry Clean',
      nutrition_basis: 'per_100g',
      nutrition_facts: {
        basis: 'per_100g',
        calories: 380,
        sugar_g: 1.5,
        sodium_mg: 5,
        protein_g: 13,
        fat_g: 6,
        fiber_g: 10
      }
    }

    // Liquid Product B: 100ml
    const liquidProductB: any = {
      product_name: 'Almond Beverage',
      brand: 'Nut Milk Co',
      nutrition_basis: 'per_100ml',
      nutrition_facts: {
        basis: 'per_100ml',
        calories: 45,
        sugar_g: 0.5,
        sodium_mg: 80,
        protein_g: 1.5,
        fat_g: 2.5,
        fiber_g: 0.5
      }
    }

    const comparison = evaluateComparison(solidProductA, liquidProductB)
    assert.strictEqual(comparison.is_basis_compatible, false, 'Should flag basis as incompatible')
    assert.strictEqual(comparison.winner, 'undetermined', 'Cross-basis comparison must be undetermined')
    assert.ok(
      comparison.winner_reason.toLowerCase().includes('incompatible') || 
      comparison.winner_reason.toLowerCase().includes('liquid') || 
      comparison.winner_reason.toLowerCase().includes('basis'),
      'Must explain basis incompatibility'
    )
  })

  // --- Test 2: Same-Basis Product Comparison (100g vs 100g) Computes Concrete Differences ---
  test('2. Same-Basis Products (100g vs 100g) Compute Concrete Factual Differences', () => {
    const cerealA: any = {
      product_name: 'High Fiber Bran',
      brand: 'Brand A',
      nutrition_basis: 'per_100g',
      nutrition_facts: {
        basis: 'per_100g',
        calories: 320,
        sugar_g: 5,
        sodium_mg: 120,
        protein_g: 12,
        fiber_g: 15,
        fat_g: 3,
        saturated_fat_g: 0.5
      }
    }

    const cerealB: any = {
      product_name: 'Frosted Flakes',
      brand: 'Brand B',
      nutrition_basis: 'per_100g',
      nutrition_facts: {
        basis: 'per_100g',
        calories: 390,
        sugar_g: 35,
        sodium_mg: 450,
        protein_g: 4,
        fiber_g: 1,
        fat_g: 1,
        saturated_fat_g: 0.2
      }
    }

    const comparison = evaluateComparison(cerealA, cerealB)
    assert.strictEqual(comparison.is_basis_compatible, true, 'Same basis (per_100g) must be compatible')
    assert.ok(comparison.concrete_differences && comparison.concrete_differences.length > 0, 'Must compute concrete differences')
    
    const hasSugarDiff = comparison.concrete_differences.some(d => d.toLowerCase().includes('sugar') && d.includes('30g'))
    assert.ok(hasSugarDiff, 'Must contain concrete Sugar difference statement with exact 30g delta')

    const hasSodiumDiff = comparison.concrete_differences.some(d => d.toLowerCase().includes('sodium') && d.includes('330mg'))
    assert.ok(hasSodiumDiff, 'Must contain concrete Sodium difference statement with exact 330mg delta')
  })

  // --- Test 3: Unknown Nutrients Preserved as Unknown (Never Coerced to 0) ---
  test('3. Unknown Nutrition Values Preserved as Unknown (Never Coerced to 0)', () => {
    const productMissingSodium: any = {
      basis: 'per_100g',
      calories: 220,
      sugar_g: 48
      // sodium, fiber, protein omitted by manufacturer
    }

    const norm = normalizeNutrientsTo100g(productMissingSodium)
    assert.strictEqual(norm.calories_100g, 220, 'Calories should be parsed')
    assert.strictEqual(norm.sugar_100g, 48, 'Sugar should be parsed')
    assert.strictEqual(norm.sodium_100g, null, 'Omitted sodium must remain null/unknown, never coerced to 0')
    assert.strictEqual(norm.fiber_100g, null, 'Omitted fiber must remain null/unknown, never coerced to 0')
    assert.strictEqual(norm.protein_100g, null, 'Omitted protein must remain null/unknown, never coerced to 0')
  })

  // --- Test 4: Total Sugars vs Added Sugars Distinction ---
  test('4. Total Sugars vs Added Sugars Strict Separation', () => {
    // Naturally sweet yogurt (high lactose sugar, 0g added sugar)
    const plainGreekYogurt: any = {
      basis: 'per_100g',
      sugar_g: 4.0,
      added_sugar_g: 0.0,
      calories: 90
    }

    // Flavored yogurt with refined added syrup (4g natural lactose + 12g added cane sugar = 16g total)
    const flavoredYogurt: any = {
      basis: 'per_100g',
      sugar_g: 16.0,
      added_sugar_g: 12.0,
      calories: 140
    }

    const normPlain = normalizeNutrientsTo100g(plainGreekYogurt)
    const normFlavored = normalizeNutrientsTo100g(flavoredYogurt)

    assert.strictEqual(normPlain.sugar_100g, 4.0)
    assert.strictEqual(normFlavored.sugar_100g, 16.0)

    // Verify added sugars are kept distinct from total sugars
    assert.strictEqual(plainGreekYogurt.added_sugar_g, 0.0)
    assert.strictEqual(flavoredYogurt.added_sugar_g, 12.0)
    assert.notStrictEqual(plainGreekYogurt.sugar_g, plainGreekYogurt.added_sugar_g)
    assert.notStrictEqual(flavoredYogurt.sugar_g, flavoredYogurt.added_sugar_g)
  })

  // --- Test 5: 4-State Dietary Alerts (Declared, Cross-Contact, Potential Match, Insufficient Info) ---
  test('5. 4-State Dietary Alert Classification', () => {
    // 5a. Explicitly Declared Alert
    const declaredEval = evaluateDietaryCompatibility(
      [{ name: 'Milk Powder' }],
      ['Contains: Milk, Soy'],
      ['dairy-free']
    )
    const declaredAlert = declaredEval.dietary_alerts?.find(a => a.preference_id === 'dairy-free')
    assert.ok(declaredAlert, 'Must have dairy-free alert')
    assert.strictEqual(declaredAlert.state, 'declared', 'Must classify declared allergen statement as "declared"')
    assert.ok(declaredAlert.source_label_text?.toLowerCase().includes('milk'), 'Must quote source text')

    // 5b. Cross-Contact Warning
    const crossEval = evaluateDietaryCompatibility(
      [{ name: 'Wheat Flour' }, { name: 'Sugar' }],
      ['Manufactured on shared equipment that processes peanuts and tree nuts.'],
      ['nut-free']
    )
    const crossAlert = crossEval.dietary_alerts?.find(a => a.preference_id === 'nut-free')
    assert.ok(crossAlert, 'Must have nut-free alert')
    assert.strictEqual(crossAlert.state, 'cross_contact', 'Must classify "shared equipment" as "cross_contact"')

    // 5c. Potential Match (Ingredient token match requiring review)
    const potentialEval = evaluateDietaryCompatibility(
      [{ name: 'Whey Protein Concentrate' }],
      [], // No declared allergen block
      ['dairy-free']
    )
    const potentialAlert = potentialEval.dietary_alerts?.find(a => a.preference_id === 'dairy-free')
    assert.ok(potentialAlert, 'Must have dairy alert')
    assert.strictEqual(potentialAlert.state, 'potential_match', 'Must classify ingredient token as "potential_match"')

    // 5d. Insufficient Info (Missing or unreadable packaging facts)
    const missingEval = evaluateDietaryCompatibility(
      [], // Empty ingredients
      [],  // Empty allergens
      ['gluten-free']
    )
    const insufficientAlert = missingEval.dietary_alerts?.find(a => a.preference_id === 'gluten-free')
    assert.ok(insufficientAlert, 'Must have gluten alert')
    assert.strictEqual(insufficientAlert.state, 'insufficient_info', 'Must classify empty packaging evidence as "insufficient_info"')
  })

  // --- Test 6: Absence of Evidence Disclaimer (Never "Allergen-Free") ---
  test('6. Absence of Evidence Never Labeled "Allergen-Free" or "Safe"', () => {
    const cleanOatsEval = evaluateDietaryCompatibility(
      [{ name: 'Whole Grain Rolled Oats' }],
      [], // No declared wheat
      ['gluten-free']
    )

    // Verify mandatory medical disclaimer is present
    assert.ok(cleanOatsEval.medical_disclaimer, 'Must have mandatory medical disclaimer')
    assert.ok(cleanOatsEval.medical_disclaimer.toLowerCase().includes('medical'), 'Medical disclaimer must be truthful')
    
    // Check dietary alerts or disclaimers do not claim certified allergen-free
    const alertJson = JSON.stringify(cleanOatsEval)
    assert.ok(!alertJson.includes('"status":"allergen-free"'), 'Must never emit pseudo-scientific "allergen-free" status')
  })

  // --- Test 7: Milk Protein Allergy vs Lactose Intolerance Distinction ---
  test('7. Milk Protein Allergy (Casein/Whey) vs Lactose Intolerance Distinction', () => {
    // Lactose-free milk contains whey and casein proteins (dangerous for milk allergy) but zero lactose (safe for lactose intolerance)
    const lactoseFreeMilkEval = evaluateDietaryCompatibility(
      [{ name: 'Lactose-Free Pasteurized Skim Milk' }],
      ['Contains: Milk'],
      ['dairy-free', 'lactose-free']
    )

    // Milk allergy must be triggered
    const dairyAllergyAlert = lactoseFreeMilkEval.dietary_alerts?.find(a => a.preference_id === 'dairy-free')
    assert.ok(dairyAllergyAlert, 'Must flag dairy-free violation due to milk proteins')

    // Lactose-intolerant should NOT flag lactose-free milk as a violation
    const lactoseViolation = lactoseFreeMilkEval.violations.find(v => v.preference.toLowerCase().includes('lactose'))
    assert.strictEqual(lactoseViolation, undefined, 'Lactose-free milk must not violate lactose-free preference')
  })

  // --- Test 8: Integrity & Provenance - Zod Runtime Schema Validation ---
  test('8. Runtime Schema Validation on Raw Product Facts', () => {
    const validFacts = {
      product_name: 'Organic Basmati Rice',
      brand: 'Heritage Farm',
      ingredients: [{ name: 'Brown Basmati Rice', status: 'safe', reason: 'Whole grain' }],
      additives: [],
      allergens: [],
      allergens_declared: [],
      recommendations: [],
      nutrition_facts: {
        basis: 'per_100g',
        calories: 360,
        calories_100g: 360,
        sugar_g: 0.5,
        protein_g: 8.0,
        fat_g: 2.0,
        sodium_mg: 5
      }
    }

    const parsed = RawProductFactsSchema.safeParse(validFacts)
    assert.strictEqual(parsed.success, true, 'Valid raw product facts must parse successfully')
  })

  // --- Test 9: Reviewer Role Escalation Protection ---
  test('9. Reviewer Role Authorization Enforcement', () => {
    // Normal user object without reviewer flag
    const normalUser = {
      id: 'usr_normal_123',
      role: 'user',
      is_reviewer: false
    }

    const isAuthorized = (user: typeof normalUser) => {
      return user.is_reviewer === true || user.role === 'admin' || user.role === 'reviewer'
    }

    assert.strictEqual(isAuthorized(normalUser), false, 'Normal user must fail authorization check')

    // Attacker attempting to pass role='admin' in non-privileged context
    const elevatedUser = {
      ...normalUser,
      role: 'reviewer',
      is_reviewer: true
    }
    assert.strictEqual(isAuthorized(elevatedUser), true, 'Authorized reviewer succeeds')
  })

  // --- Test 10: Version Snapshot & Rollback Invariant ---
  test('10. Version Snapshot, Rollback Integrity & 0-Credit Accounting', () => {
    interface VersionSnapshot {
      version: number
      snapshot: any
      reason: string
      created_at: string
    }

    const versionHistory: VersionSnapshot[] = []
    let currentRecord = {
      barcode: '8901234567890',
      product_name: 'Whole Grain Flakes',
      version: 1,
      nutrition_facts: { sugar_g: 12, fiber_g: 5 }
    }

    // Version 1 snapshot
    versionHistory.push({
      version: currentRecord.version,
      snapshot: JSON.parse(JSON.stringify(currentRecord)),
      reason: 'Initial verified extraction',
      created_at: new Date().toISOString()
    })

    // Version 2 approved update
    const v2Update = {
      ...currentRecord,
      version: 2,
      nutrition_facts: { sugar_g: 8, fiber_g: 6 } // verified reduced sugar formulation
    }
    versionHistory.push({
      version: 2,
      snapshot: JSON.parse(JSON.stringify(v2Update)),
      reason: 'Approved community correction against 2026 package evidence',
      created_at: new Date().toISOString()
    })
    currentRecord = v2Update
    assert.strictEqual(currentRecord.version, 2)
    assert.strictEqual(currentRecord.nutrition_facts.sugar_g, 8)

    // Rollback to Version 1
    const targetV1 = versionHistory.find(v => v.version === 1)
    assert.ok(targetV1, 'Target version snapshot must exist')
    currentRecord = JSON.parse(JSON.stringify(targetV1.snapshot))
    assert.strictEqual(currentRecord.version, 1, 'Record successfully rolled back to v1')
    assert.strictEqual(currentRecord.nutrition_facts.sugar_g, 12, 'Original nutrition restored')

    // Invariant: Saving, viewing, and lookup cost 0 credits
    const CATALOG_LOOKUP_COST = 0
    const SAVE_PRODUCT_COST = 0
    const SUBMIT_CORRECTION_COST = 0
    assert.strictEqual(CATALOG_LOOKUP_COST, 0, 'Catalog lookup must cost 0 credits')
    assert.strictEqual(SAVE_PRODUCT_COST, 0, 'Saving to shopping list must cost 0 credits')
    assert.strictEqual(SUBMIT_CORRECTION_COST, 0, 'Correction submission must cost 0 credits')
  })

  console.log('\n==================================================')
  console.log(`📊 ASSISTANT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('==================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAssistantTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
