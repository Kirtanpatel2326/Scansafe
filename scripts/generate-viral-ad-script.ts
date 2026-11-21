/**
 * ScanSafe Automated Viral Ad & Reel Generator Engine
 * 
 * Takes any food product from catalog or custom input,
 * runs it through ScanSafe's proprietary engines (Greenwashing, Synergies, Smart Swaps),
 * and automatically produces:
 * 1. 15-second high-retention video script (Hook -> Reveal -> ScanSafe -> Smart Swap -> CTA)
 * 2. Visual storyboard cues & frame-by-frame asset directions
 * 3. Word-by-word animated caption timings
 * 4. High-conversion social post caption with 'Comment SCAN' ManyChat trigger
 */

import { detectChemicalSynergies } from '../lib/synergies'
import { detectGreenwashing } from '../lib/greenwashing'
import { getSmartSwaps } from '../lib/smart-swap'

export interface ViralAdPackage {
  productName: string
  targetPlatform: 'Instagram Reels' | 'YouTube Shorts' | 'TikTok'
  durationSeconds: number
  script: {
    hook: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
    problem: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
    scanReveal: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
    findings: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
    smartSwap: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
    cta: { timestamp: string; voiceover: string; visualCue: string; textOverlay: string }
  }
  voiceoverFullText: string
  socialPost: {
    caption: string
    pinnedComment: string
    manyChatAutomationTrigger: string
    hashtags: string[]
  }
}

export function generateViralAd(
  productName: string,
  ingredients: string[],
  frontClaims: string[],
  healthScore: number,
  category = 'Biscuits'
): ViralAdPackage {
  const ingObjs = ingredients.map(name => ({ name }))
  const synergies = detectChemicalSynergies(ingObjs)
  const greenwashing = detectGreenwashing(productName, '', ingObjs, undefined, frontClaims)
  const smartSwaps = getSmartSwaps(productName, category, healthScore, synergies.length > 0)

  const topSynergy = synergies[0]
  const topGreenwashing = greenwashing[0]
  const topSwap = smartSwaps[0]

  // Dynamic Hook & Problem based on ScanSafe real engines
  let hookLine = `You think this ${productName} is healthy? You are being lied to.`
  let problemLine = `Look at the fine print on the back. It is packed with ultra-processed fillers.`
  let findingsLine = `ScanSafe scores it a low ${healthScore}/100 and flags hazardous additives.`

  if (topGreenwashing) {
    hookLine = `Stop falling for this: "${topGreenwashing.claim_detected}" on the front of ${productName} is a complete corporate lie.`
    problemLine = `The packaging screams "${topGreenwashing.claim_detected}", but ${topGreenwashing.reality_uncovered}`
  } else if (topSynergy) {
    const ingA = topSynergy.ingredients_involved[0] || 'Additive A'
    const ingB = topSynergy.ingredients_involved[1] || 'Additive B'
    hookLine = `Do NOT eat or drink this ${productName} without knowing what happens inside your body.`
    problemLine = `When ${ingA} mixes with ${ingB}, it creates a dangerous interaction.`
  }

  if (topSynergy) {
    findingsLine = `ScanSafe flags a severe chemical interaction hazard: ${topSynergy.title}.`
  }

  const swapName = topSwap ? topSwap.name : 'a 100% clean whole-food alternative'
  const swapReason = topSwap ? topSwap.why_better : 'zero chemical additives and unrefined ingredients'

  return {
    productName,
    targetPlatform: 'Instagram Reels',
    durationSeconds: 15,
    script: {
      hook: {
        timestamp: '00:00 - 00:03',
        voiceover: hookLine,
        visualCue: `Fast zoom on product front packaging. Show bold red highlight over the deceptive front claim.`,
        textOverlay: `🚨 DON'T EAT THIS!`
      },
      problem: {
        timestamp: '00:03 - 00:06',
        voiceover: problemLine,
        visualCue: `Flip package to back panel. Extreme zoom on tiny 6pt ingredient list with magnifying circle.`,
        textOverlay: `❌ 95% PROCESSED FILLERS`
      },
      scanReveal: {
        timestamp: '00:06 - 00:09',
        voiceover: `I took one photo with ScanSafe at scansafe.co.in — no barcode needed.`,
        visualCue: `Show smartphone screen running ScanSafe live camera scanner with green laser sweep animation.`,
        textOverlay: `📱 SCANNING WITHOUT BARCODE...`
      },
      findings: {
        timestamp: '00:09 - 00:12',
        voiceover: findingsLine,
        visualCue: `ScanSafe result card flashes RED. Show Health Score: ${healthScore}/100 and chemical warning badge.`,
        textOverlay: `⚠️ SCORE: ${healthScore}/100 (HIGH RISK)`
      },
      smartSwap: {
        timestamp: '00:12 - 00:14',
        voiceover: `Instead, ScanSafe suggests ${swapName} — ${swapReason}.`,
        visualCue: `Screen transitions to green Smart Swap card with 1-click buy button and verified clean badge.`,
        textOverlay: `✅ BUY THIS INSTEAD!`
      },
      cta: {
        timestamp: '00:14 - 00:16',
        voiceover: `Comment "SCAN" below and I’ll DM you the free link to scan your pantry right now!`,
        visualCue: `Point down to comment section with animated text: 'Comment SCAN for free access'.`,
        textOverlay: `👇 COMMENT "SCAN" FOR FREE TOOL`
      }
    },
    voiceoverFullText: `${hookLine} ${problemLine} I took one photo with ScanSafe at scansafe.co.in. ${findingsLine} Instead, switch to ${swapName}. Comment "SCAN" below and I'll DM you the free scanner!`,
    socialPost: {
      caption: `⚠️ The packaged food industry doesn't want you to flip the box.\n\nWe ran ${productName} through ScanSafe's AI Vision engine (https://scansafe.co.in), and what we found on the ingredient label is shocking.\n\nStop eating ultra-processed foods blindly. Scan any packaged food in 2 seconds with zero barcodes.\n\n👇 COMMENT "SCAN" and I will instantly DM you the direct link to scan your kitchen snacks for free!`,
      pinnedComment: `🔗 Want to scan your food? Comment "SCAN" or head directly to https://scansafe.co.in — 100% free camera scanner, zero app download required!`,
      manyChatAutomationTrigger: `Keyword: SCAN -> Instant Auto-DM: "Hey! Here is the free link to scan any food packaging directly from your camera: https://scansafe.co.in 🥦 Tell me what score you get!"`,
      hashtags: ['#FoodTruth', '#UltraProcessedFood', '#CleanEating', '#ScanSafe', '#HealthHack', '#NutritionTips', '#FoodScanner', '#HealthySwaps']
    }
  }
}

// Sample Demonstration Execution
if (require.main === module) {
  console.log('🎬 GENERATING VIRAL SCANSAFE AD PACKAGE FOR COMMERICAL DIGESTIVE BISCUITS...\n')
  
  const sampleAd = generateViralAd(
    'Commercial "High Fiber" Digestive Biscuits',
    ['Refined Wheat Flour (Maida)', 'Palm Oil', 'Sugar', 'Maltodextrin', 'Invert Syrup', 'Sodium Benzoate', 'Ascorbic Acid'],
    ['High Fiber Whole Grain', 'Zero Added Preservatives', 'Heart Healthy'],
    28,
    'Biscuits'
  )

  console.log('======================================================================')
  console.log(`📱 VIRAL REEL SCRIPT: ${sampleAd.productName}`)
  console.log(`⏱️ Duration: ${sampleAd.durationSeconds}s | Format: 9:16 Vertical`)
  console.log('======================================================================\n')

  Object.entries(sampleAd.script).forEach(([key, step]) => {
    console.log(`[${step.timestamp}] ${key.toUpperCase()}`)
    console.log(`  🗣️ Voiceover: "${step.voiceover}"`)
    console.log(`  🎥 Visual: ${step.visualCue}`)
    console.log(`  🔤 Overlay: [ ${step.textOverlay} ]\n`)
  })

  console.log('======================================================================')
  console.log('📋 COMPLETE VOICEOVER SCRIPT (FOR TTS / VOICE ACTOR):')
  console.log('======================================================================')
  console.log(`"${sampleAd.voiceoverFullText}"\n`)

  console.log('======================================================================')
  console.log('💬 INSTAGRAM / TIKTOK CAPTION & MANYCHAT TRIGGER:')
  console.log('======================================================================')
  console.log(sampleAd.socialPost.caption)
  console.log('\n🤖 ManyChat Trigger Rule:')
  console.log(sampleAd.socialPost.manyChatAutomationTrigger)
}
