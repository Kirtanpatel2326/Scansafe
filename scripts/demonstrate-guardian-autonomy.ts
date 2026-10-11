/**
 * SCANSAFE GUARDIAN AI — REAL AUTONOMOUS REASONING & REPLANNING DEMONSTRATION
 * 
 * Executes three unfamiliar shopping goals with real product evidence retrieved
 * live from Open Food Facts public database and verified by the deterministic engine.
 * 
 * Captures:
 * 1. User goal & dietary constraints
 * 2. Gemini 2.5 Flash / Bounded planner generated plan
 * 3. Tools called with exact arguments
 * 4. Real source URLs, GTINs, and timestamps
 * 5. Dynamic plan changes & tool transitions
 * 6. Deterministic verification decisions (independent of LLM)
 * 7. Final safe product shortlist
 */

import fs from 'node:fs'
import path from 'node:path'
import { runGuardianAutonomousAgent } from '../lib/guardian-agent/orchestrator/engine'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}
loadEnvLocal()

interface DemonstrationResult {
  goalId: string
  userGoal: string
  constraints: string[]
  planMode: string
  generatedStages: string[]
  toolsCalled: Array<{
    tool: string
    durationMs: number
    status: string
    description: string
  }>
  dynamicPlanChanges: string[]
  evidenceItems: Array<{
    id: string
    name: string
    brand?: string
    gtin?: string
    sourceUrl?: string
    retrievedAt: string
    sourceType: string
    verificationStatus: string
    evaluationStatus: string
    allergenStatus: string
    reasons: string[]
  }>
  finalShortlist: string[]
  uncertainties: string[]
}

async function runAutonomousDemonstrations() {
  console.log('======================================================================')
  console.log('🤖 SCANSAFE GUARDIAN AI — LIVE AUTONOMOUS EXECUTION DEMONSTRATIONS')
  console.log('======================================================================\n')

  const demonstrations: DemonstrationResult[] = []

  const testScenarios = [
    {
      goalId: 'DEMO-1',
      goal: 'Find low-sugar gluten-free and milk-free vegan energy bars',
      constraints: ['gluten', 'milk'] as ('gluten' | 'milk')[]
    },
    {
      goalId: 'DEMO-2',
      goal: 'Find nut-free and peanut-free organic seed butter spread',
      constraints: ['peanut', 'tree_nut'] as ('peanut' | 'tree_nut')[]
    },
    {
      goalId: 'DEMO-3',
      goal: 'Find soy-free and egg-free savory dipping sauce',
      constraints: ['soy', 'egg'] as ('soy' | 'egg')[]
    }
  ]

  for (const scenario of testScenarios) {
    console.log(`\n----------------------------------------------------------------------`)
    console.log(`▶ Executing ${scenario.goalId}: "${scenario.goal}"`)
    console.log(`  Strict Constraints: [${scenario.constraints.join(', ')}]`)
    console.log(`----------------------------------------------------------------------`)

    const startedAt = Date.now()
    const result = await runGuardianAutonomousAgent({
      goal: scenario.goal,
      constraints: scenario.constraints,
      allowInternalCatalog: true,
      allowPublicOffCatalog: true,
      allowPartnerCatalog: false,
      maxResults: 5
    })

    const replanStages = result.plan.filter(p => p.includes('Dynamic Replan'))
    const toolsCalled = result.steps.map(s => ({
      tool: s.tool,
      durationMs: s.durationMs,
      status: s.status,
      description: s.description
    }))

    const evidenceItems = result.products.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      gtin: (p as any).gtin as string | undefined,
      sourceUrl: p.sourceUrl,
      retrievedAt: p.retrievedAt || new Date().toISOString(),
      sourceType: p.sourceType,
      verificationStatus: p.verificationStatus || 'CROWDSOURCED_COMMUNITY',
      evaluationStatus: p.status,
      allergenStatus: p.allergenStatus,
      reasons: p.reasons
    }))

    demonstrations.push({
      goalId: scenario.goalId,
      userGoal: scenario.goal,
      constraints: scenario.constraints,
      planMode: result.mode,
      generatedStages: result.plan,
      toolsCalled,
      dynamicPlanChanges: replanStages,
      evidenceItems,
      finalShortlist: result.shortlist,
      uncertainties: result.uncertainties
    })

    console.log(`  Plan Mode: ${result.mode}`)
    console.log(`  Plan Stages Formulated: ${result.plan.length}`)
    console.log(`  Dynamic Replan Changes: ${replanStages.length}`)
    console.log(`  Total Products Evaluated: ${result.products.length}`)
    console.log(`  Safe Candidate Shortlist: [${result.shortlist.join(', ') || 'None qualifying'}]`)
    console.log(`  Elapsed Time: ${Date.now() - startedAt}ms`)

    for (const [idx, item] of result.products.entries()) {
      console.log(`    [#${idx + 1}] "${item.name}" (GTIN: ${(item as any).gtin || 'N/A'}) -> Status: ${item.status.toUpperCase()} (${item.allergenStatus})`)
      if (item.sourceUrl) console.log(`         URL: ${item.sourceUrl}`)
      if (item.reasons.length > 0) console.log(`         Reason: ${item.reasons[0]}`)
    }
  }

  console.log('\n======================================================================')
  console.log(`✅ COMPLETED ALL 3 LIVE AUTONOMOUS DEMONSTRATIONS SUCCESSFULLY`)
  console.log('======================================================================\n')

  return demonstrations
}

if (require.main === module) {
  runAutonomousDemonstrations().catch(err => {
    console.error('Fatal error during autonomous demonstrations:', err)
    process.exit(1)
  })
}

export { runAutonomousDemonstrations }
