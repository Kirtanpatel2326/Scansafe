/**
 * ScanSafe Automated Viral Ad & Video Engine
 * 
 * Powered by ScanSafe's Chemical Synergy Engine, Greenwashing Exposer, and Smart Swaps.
 * Produces high-retention 15-second short-form video scripts, frame-by-frame visual cues,
 * animated text overlays, neural voiceover text, and ManyChat comment automation triggers.
 */

import { detectChemicalSynergies, ChemicalSynergy } from './synergies'
import { detectGreenwashing, GreenwashingFlag } from './greenwashing'
import { getSmartSwaps, SmartSwapItem } from './smart-swap'

export interface StoryboardStep {
  id: string
  phase: 'HOOK' | 'PROBLEM' | 'SCAN_REVEAL' | 'FINDINGS' | 'SMART_SWAP' | 'CTA'
  timestamp: string
  secondsStart: number
  secondsEnd: number
  voiceover: string
  visualCue: string
  textOverlay: string
  overlayColor: 'red' | 'emerald' | 'amber' | 'white'
  soundEffect: 'record_scratch' | 'whoosh' | 'laser_beep' | 'danger_alarm' | 'success_ding' | 'cash_register'
}

export interface ViralAdPackage {
  id: string
  productName: string
  category: string
  healthScore: number
  durationSeconds: number
  storyboard: StoryboardStep[]
  voiceoverFullText: string
  audioTtsUrl: string
  topSynergy?: ChemicalSynergy
  topGreenwashing?: GreenwashingFlag
  topSwap?: SmartSwapItem
  socialPost: {
    caption: string
    pinnedComment: string
    manyChatAutomationTrigger: string
    hashtags: string[]
  }
}

export interface ProductPreset {
  id: string
  name: string
  category: string
  claimedFrontTitle: string
  frontClaims: string[]
  ingredients: string[]
  healthScore: number
  emoji: string
}

export const VIRAL_PRODUCT_PRESETS: ProductPreset[] = [
  {
    id: 'digestive_biscuits',
    name: 'Commercial "High Fiber" Digestive Biscuits',
    category: 'Biscuits',
    claimedFrontTitle: '100% Whole Wheat & High Fiber',
    frontClaims: ['High Fiber', 'Whole Wheat', 'Heart Healthy', 'Digestive Care'],
    ingredients: ['Refined Wheat Flour (Maida)', 'Palm Oil', 'Sugar', 'Maltodextrin', 'Invert Sugar Syrup', 'Sodium Benzoate', 'Ascorbic Acid'],
    healthScore: 28,
    emoji: '🍪'
  },
  {
    id: 'brown_bread',
    name: 'Commercial "Healthy" Brown Bread',
    category: 'Bread',
    claimedFrontTitle: '100% Whole Grain Brown Bread',
    frontClaims: ['100% Whole Grain', 'No Added Sugar', 'Zero Maida'],
    ingredients: ['Refined Wheat Flour (Maida)', 'Caramel Color INS 150d', 'Palm Olein', 'Maltodextrin', 'Potassium Bromate', 'Preservative 282'],
    healthScore: 22,
    emoji: '🍞'
  },
  {
    id: 'real_fruit_juice',
    name: 'Packaged "100% Real" Mixed Fruit Juice',
    category: 'Beverages',
    claimedFrontTitle: '100% Real Fruit & No Added Preservatives',
    frontClaims: ['100% Real Fruit', 'Zero Added Sugar', 'Immunity Booster'],
    ingredients: ['Water', 'Reconstituted Fruit Juice Concentrate 12%', 'High Fructose Corn Syrup', 'Liquid Glucose', 'Sodium Benzoate', 'Ascorbic Acid', 'Artificial Colors'],
    healthScore: 31,
    emoji: '🧃'
  },
  {
    id: 'instant_noodles',
    name: 'Commercial "Atta" Instant Noodles',
    category: 'Noodles',
    claimedFrontTitle: 'Healthy Veggie Atta Noodles',
    frontClaims: ['Whole Wheat Atta', 'Source of Protein', 'Real Veggies'],
    ingredients: ['Refined Wheat Flour 65%', 'Whole Wheat Flour 15%', 'Palm Oil', 'Monosodium Glutamate', 'TBHQ Antioxidant', 'Hydrolyzed Soy Protein'],
    healthScore: 24,
    emoji: '🍜'
  },
  {
    id: 'diet_energy_drink',
    name: '"Zero Sugar" Ultra Energy Drink',
    category: 'Energy Drinks',
    claimedFrontTitle: 'Zero Sugar & Extreme Focus',
    frontClaims: ['Zero Sugar', 'Zero Calories', 'All Natural Caffeine'],
    ingredients: ['Carbonated Water', 'Sucralose', 'Acesulfame Potassium', 'Maltodextrin', 'Sodium Benzoate', 'Citric Acid', 'Synthetic Taurine'],
    healthScore: 19,
    emoji: '⚡'
  },
  {
    id: 'olive_oil_chips',
    name: 'Gourmet "Made with Olive Oil" Potato Chips',
    category: 'Snacks',
    claimedFrontTitle: 'Slow-Cooked in Olive Oil',
    frontClaims: ['Cooked in Olive Oil', 'Zero Cholesterol', 'Sea Salt'],
    ingredients: ['Potatoes', 'Refined Palm Olein 95%', 'Extra Virgin Olive Oil 2%', 'Maltodextrin', 'Artificial Flavoring', 'TBHQ'],
    healthScore: 35,
    emoji: '🥔'
  }
]

export function generateViralAd(
  productName: string,
  ingredients: string[],
  frontClaims: string[],
  healthScore: number,
  category = 'Snacks',
  lang = 'en'
): ViralAdPackage {
  const ingObjs = ingredients.map(name => ({ name }))
  const synergies = detectChemicalSynergies(ingObjs)
  const greenwashing = detectGreenwashing(productName, '', ingObjs, undefined, frontClaims)
  const smartSwaps = getSmartSwaps(productName, category, healthScore, synergies.length > 0)

  const topSynergy = synergies[0]
  const topGreenwashing = greenwashing[0]
  const topSwap = smartSwaps[0]

  // Dynamic Hook & Problem
  let hookLine = `You think this ${productName} is healthy? You are being lied to by clever marketing.`
  let problemLine = `Look closely at the fine print on the back label. It is packed with ultra-processed fillers and disguised industrial sugars.`
  let findingsLine = `ScanSafe scores it a low ${healthScore} out of 100 and flags hazardous additives.`

  if (topGreenwashing) {
    hookLine = `Stop falling for this: "${topGreenwashing.claim_detected}" on ${productName} is a complete corporate lie.`
    problemLine = `The packaging screams "${topGreenwashing.claim_detected}", but ${topGreenwashing.reality_uncovered}`
  } else if (topSynergy) {
    const ingA = topSynergy.ingredients_involved[0] || 'Additive A'
    const ingB = topSynergy.ingredients_involved[1] || 'Additive B'
    hookLine = `Do NOT eat or drink this ${productName} without knowing what happens inside your body.`
    problemLine = `When ${ingA} mixes with ${ingB}, it creates a dangerous interaction cocktail.`
  }

  if (topSynergy) {
    findingsLine = `ScanSafe flags a severe chemical interaction: ${topSynergy.title}.`
  }

  const swapName = topSwap ? topSwap.name : 'a 100% clean whole-food alternative'
  const swapReason = topSwap ? topSwap.why_better : 'zero chemical additives, zero palm oil, and unrefined ingredients'

  // Paced for 20-25 seconds (target ~22-23 seconds optimal mobile retention)
  const storyboard: StoryboardStep[] = [
    {
      id: 'step_1_hook',
      phase: 'HOOK',
      timestamp: '00:00 - 00:04',
      secondsStart: 0,
      secondsEnd: 4,
      voiceover: hookLine,
      visualCue: `Fast dynamic zoom onto ${productName}. Flash a bold red marker box highlighting the deceptive front claim.`,
      textOverlay: `🚨 DON'T EAT THIS!`,
      overlayColor: 'red',
      soundEffect: 'record_scratch'
    },
    {
      id: 'step_2_problem',
      phase: 'PROBLEM',
      timestamp: '00:04 - 00:08',
      secondsStart: 4,
      secondsEnd: 8,
      voiceover: problemLine,
      visualCue: `Rapidly flip package to back ingredient panel. Zoom into the 6pt font with magnifying circle showing the hidden ingredients.`,
      textOverlay: `❌ 95% PROCESSED FILLERS`,
      overlayColor: 'red',
      soundEffect: 'whoosh'
    },
    {
      id: 'step_3_scan_reveal',
      phase: 'SCAN_REVEAL',
      timestamp: '00:08 - 00:12',
      secondsStart: 8,
      secondsEnd: 12,
      voiceover: `I took one photo with ScanSafe at scansafe.co.in — no barcode needed, instant ingredient breakdown.`,
      visualCue: `Show hand taking phone snapshot. ScanSafe live camera viewfinder appears with neon green laser sweep animation.`,
      textOverlay: `📱 SCANNING WITHOUT BARCODE...`,
      overlayColor: 'emerald',
      soundEffect: 'laser_beep'
    },
    {
      id: 'step_4_findings',
      phase: 'FINDINGS',
      timestamp: '00:12 - 00:16',
      secondsStart: 12,
      secondsEnd: 16,
      voiceover: findingsLine,
      visualCue: `ScanSafe result card flashes RED on phone screen. Health score dial drops to ${healthScore}/100 with hazard warning tag.`,
      textOverlay: `⚠️ SCORE: ${healthScore}/100 (HIGH RISK)`,
      overlayColor: 'red',
      soundEffect: 'danger_alarm'
    },
    {
      id: 'step_5_smart_swap',
      phase: 'SMART_SWAP',
      timestamp: '00:16 - 00:19',
      secondsStart: 16,
      secondsEnd: 19,
      voiceover: `Instead, switch to ${swapName} — ${swapReason}.`,
      visualCue: `Screen flips to vibrant emerald Smart Swap card with 1-click buy button and verified clean badge.`,
      textOverlay: `✅ BUY THIS INSTEAD!`,
      overlayColor: 'emerald',
      soundEffect: 'success_ding'
    },
    {
      id: 'step_6_cta',
      phase: 'CTA',
      timestamp: '00:19 - 00:23',
      secondsStart: 19,
      secondsEnd: 23,
      voiceover: `Comment "SCAN" below and I’ll DM you the free link to scan your kitchen pantry right now!`,
      visualCue: `Point finger down toward the comment section with bouncing animated button: 'Comment SCAN for free access'.`,
      textOverlay: `👇 COMMENT "SCAN" FOR FREE TOOL`,
      overlayColor: 'white',
      soundEffect: 'cash_register'
    }
  ]

  const voiceoverFullText = `${hookLine} ${problemLine} I took one photo with ScanSafe at scansafe.co.in. ${findingsLine} Instead, switch to ${swapName}. Comment "SCAN" below and I'll DM you the free scanner!`
  const audioTtsUrl = `/api/tts?text=${encodeURIComponent(voiceoverFullText.slice(0, 500))}&lang=${lang}`

  return {
    id: `ad_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    productName,
    category,
    healthScore,
    durationSeconds: 23,
    storyboard,
    voiceoverFullText,
    audioTtsUrl,
    topSynergy,
    topGreenwashing,
    topSwap,
    socialPost: {
      caption: `⚠️ The packaged food industry doesn't want you to flip the box.\n\nWe ran ${productName} through ScanSafe's AI Vision engine (https://scansafe.co.in), and what we found on the ingredient label is shocking.\n\nStop eating ultra-processed foods blindly. Scan any packaged food in 2 seconds with zero barcodes.\n\n👇 COMMENT "SCAN" and I will instantly DM you the direct link to scan your kitchen snacks for free!`,
      pinnedComment: `🔗 Want to scan your food? Comment "SCAN" or head directly to https://scansafe.co.in — 100% free camera scanner, zero app download required!`,
      manyChatAutomationTrigger: `Trigger: Comment contains 'SCAN' -> Instant Auto-DM: "Hey! Here is the free link to scan any food packaging directly from your camera: https://scansafe.co.in 🥦 Tell me what score you get!"`,
      hashtags: ['#FoodTruth', '#UltraProcessedFood', '#CleanEating', '#ScanSafe', '#NutritionHacks', '#FoodScanner', '#HealthySwaps', '#ViralReels']
    }
  }
}
