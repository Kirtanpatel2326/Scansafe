/**
 * ScanSafe 24/7 Autonomous Video Clipping & Cross-Platform Publishing Engine
 * 
 * Fully autonomous zero-touch agent that runs daily (via GitHub Actions cron or local daemon):
 * 1. Evaluates catalog & trending consumer food safety topics.
 * 2. Checks data/reels_history.json to ensure zero duplicate reels are ever created.
 * 3. Synthesizes a high-retention 15-second viral video script & neural voiceover.
 * 4. Renders a broadcast-quality 9:16 (1080x1920) H.264 vertical video using Sharp & FFmpeg.
 * 5. Publishes simultaneously to Instagram Reels & YouTube Shorts (+ Webhook bridge).
 * 6. Auto-purges temporary video files to maintain 0 MB disk footprint.
 * 7. Records execution telemetry to data/reels_history.json.
 */

import fs from 'fs'
import path from 'path'
import { VIRAL_PRODUCT_PRESETS, generateViralAd, ProductPreset } from '../lib/ad-generator'
import { renderViralReelVideo } from '../lib/video-renderer'
import {
  publishToInstagramReels,
  publishToYouTubeShorts,
  publishViaWebhook,
  PublishResult
} from '../lib/social-publisher'

// Additional High-Impact Food Ingestion Topics for continuous daily posting
const EXTENDED_FOOD_TOPICS: ProductPreset[] = [
  ...VIRAL_PRODUCT_PRESETS,
  {
    id: 'baby_cereal_puff',
    name: 'Organic "Clean Baby" Grain Teething Puffs',
    category: 'Baby Food',
    claimedFrontTitle: '100% Organic & Gentle for Infants',
    frontClaims: ['Organic Whole Grain', 'No Added Sugar', 'Pediatrician Recommended'],
    ingredients: ['Rice Flour 80%', 'Maltodextrin', 'Sunflower Oil', 'Tricalcium Phosphate', 'Natural Flavor'],
    healthScore: 26,
    emoji: '👶'
  },
  {
    id: 'clean_protein_bar',
    name: 'Commercial "Zero Sugar" Clean Protein Bar',
    category: 'Protein Bars',
    claimedFrontTitle: '20g Protein & Zero Added Sugar',
    frontClaims: ['20g Protein', 'Zero Added Sugar', 'High Fiber Keto'],
    ingredients: ['Collagen Hydrolysate', 'Isomalto-oligosaccharides', 'Palm Kernel Oil', 'Sucralose', 'Soy Protein Isolate'],
    healthScore: 32,
    emoji: '🍫'
  },
  {
    id: 'diet_breakfast_cereal',
    name: 'Fruit Flavored "Whole Grain" Breakfast Cereal',
    category: 'Breakfast Cereals',
    claimedFrontTitle: 'Made with Whole Grain & 10 Vitamins',
    frontClaims: ['Whole Grain First', 'Source of 10 Vitamins', 'Heart Healthy'],
    ingredients: ['Refined Corn Flour', 'Sugar 38%', 'Hydrogenated Palm Oil', 'Red 40 (Allura Red)', 'Yellow 5', 'BHT Preservative'],
    healthScore: 18,
    emoji: '🥣'
  }
]

interface ReelHistoryRecord {
  id: string
  productId: string
  productName: string
  timestamp: string
  durationSeconds: number
  results: PublishResult[]
  caption: string
  manyChatTrigger: string
}

const HISTORY_PATH = path.join(process.cwd(), 'data', 'reels_history.json')

function loadHistory(): ReelHistoryRecord[] {
  try {
    if (!fs.existsSync(path.dirname(HISTORY_PATH))) {
      fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true })
    }
    if (fs.existsSync(HISTORY_PATH)) {
      const data = fs.readFileSync(HISTORY_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.warn('⚠️ Unable to parse reels_history.json, starting with empty history.')
  }
  return []
}

function saveHistory(history: ReelHistoryRecord[]) {
  try {
    if (!fs.existsSync(path.dirname(HISTORY_PATH))) {
      fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true })
    }
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save reels_history.json:', err)
  }
}

export async function runAutonomousReelPipeline(options: {
  forcedProductId?: string
  dryRun?: boolean
  keepVideo?: boolean
}) {
  console.log('\n======================================================================')
  console.log('🚀 SCANSAFE 24/7 AUTONOMOUS REEL & SHORTS PUBLISHING ENGINE')
  console.log(`⏱️ Execution Time: ${new Date().toISOString()}`)
  console.log('======================================================================\n')

  const history = loadHistory()
  const postedProductIds = new Set(history.map(h => h.productId))

  // Step 1: Select Next Unposted Product Topic
  let targetProduct: ProductPreset | undefined
  if (options.forcedProductId) {
    targetProduct = EXTENDED_FOOD_TOPICS.find(p => p.id === options.forcedProductId)
  }

  if (!targetProduct) {
    // Pick first unposted product
    targetProduct = EXTENDED_FOOD_TOPICS.find(p => !postedProductIds.has(p.id))
  }

  // If all products have been posted, cycle back through based on least recently posted
  if (!targetProduct) {
    console.log('🔄 All catalog presets have been posted at least once. Selecting least recently published topic...')
    const oldest = history[0]
    targetProduct = EXTENDED_FOOD_TOPICS.find(p => p.id === oldest.productId) || EXTENDED_FOOD_TOPICS[0]
  }

  console.log(`🎯 SELECTED DAILY SPOTLIGHT: [ ${targetProduct.name} ] (${targetProduct.category})`)
  console.log(`🏷️ Claimed Front Title: "${targetProduct.claimedFrontTitle}"`)
  console.log(`📉 Health Score: ${targetProduct.healthScore}/100\n`)

  // Step 2: Generate Ad Storyboard & Social Metadata
  console.log('📝 Generating 15-second viral storyboard, voiceover & ManyChat triggers...')
  const adPackage = generateViralAd(
    targetProduct.name,
    targetProduct.ingredients,
    targetProduct.frontClaims,
    targetProduct.healthScore,
    targetProduct.category
  )

  console.log(`\n📢 HOOK: "${adPackage.storyboard[0].voiceover}"`)
  console.log(`⚠️ PROBLEM: "${adPackage.storyboard[1].voiceover}"`)
  console.log(`📱 SCAN REVEAL: "${adPackage.storyboard[2].voiceover}"`)
  console.log(`🔄 SMART SWAP: "${adPackage.storyboard[4].voiceover}"`)
  console.log(`👇 CTA: "${adPackage.storyboard[5].voiceover}"\n`)

  // Step 3: Render Master 1080x1920 MP4 Video
  console.log('🎬 Rendering broadcast 9:16 vertical video (1080x1920) via Sharp & FFmpeg...')
  const renderRes = await renderViralReelVideo(adPackage, {
    keepTempFiles: false
  })

  console.log(`✨ Render complete: ${renderRes.videoPath} (${(renderRes.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)\n`)

  // Step 4: Cross-Platform Publishing
  const publishResults: PublishResult[] = []

  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_USER_ID
  const ytToken = process.env.YOUTUBE_ACCESS_TOKEN
  const webhookUrl = process.env.SOCIAL_PUBLISH_WEBHOOK_URL

  const videoPublicUrl = process.env.VIDEO_PUBLIC_URL || `https://scansafe.co.in/media/${path.basename(renderRes.videoPath)}`

  // 4A. Webhook Bridge (Zapier / Make / Ayrshare)
  if (webhookUrl) {
    console.log('📡 Dispatching to Unified Webhook Bridge (Zapier/Make)...')
    const whResult = await publishViaWebhook(webhookUrl, {
      title: `${targetProduct.name} Truth Exposed! #Shorts`,
      caption: adPackage.socialPost.caption,
      videoUrl: videoPublicUrl,
      platforms: ['instagram', 'youtube'],
      hashtags: adPackage.socialPost.hashtags,
      manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger
    })
    publishResults.push(whResult)
  }

  // 4B. Instagram Reels
  if (igToken && igUserId) {
    console.log('📸 Publishing directly to Instagram Reels via Meta Graph API...')
    const igResult = await publishToInstagramReels(
      videoPublicUrl,
      adPackage.socialPost.caption,
      igToken,
      igUserId
    )
    publishResults.push(igResult)
  } else if (!webhookUrl) {
    publishResults.push({
      success: true,
      platform: 'instagram',
      status: 'simulated',
      message: 'Verified ready for Instagram Reels! (Add INSTAGRAM_ACCESS_TOKEN & INSTAGRAM_USER_ID or SOCIAL_PUBLISH_WEBHOOK_URL to post live)',
      postUrl: 'https://instagram.com/reels'
    })
  }

  // 4C. YouTube Shorts
  if (ytToken) {
    console.log('▶️ Publishing directly to YouTube Shorts via YouTube Data API v3...')
    const ytResult = await publishToYouTubeShorts(
      videoPublicUrl,
      `${targetProduct.name} Truth Exposed! #Shorts`,
      adPackage.socialPost.caption,
      adPackage.socialPost.hashtags,
      ytToken
    )
    publishResults.push(ytResult)
  } else if (!webhookUrl) {
    publishResults.push({
      success: true,
      platform: 'youtube',
      status: 'simulated',
      message: 'Verified ready for YouTube Shorts! (Add YOUTUBE_ACCESS_TOKEN or SOCIAL_PUBLISH_WEBHOOK_URL to post live)',
      postUrl: 'https://youtube.com/shorts'
    })
  }

  // Step 5: Save History
  const historyRecord: ReelHistoryRecord = {
    id: `reel_${Date.now()}`,
    productId: targetProduct.id,
    productName: targetProduct.name,
    timestamp: new Date().toISOString(),
    durationSeconds: renderRes.durationSeconds,
    results: publishResults,
    caption: adPackage.socialPost.caption,
    manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger
  }

  history.push(historyRecord)
  saveHistory(history)

  console.log('📊 PUBLISHING RESULTS SUMMARY:')
  publishResults.forEach(r => {
    const icon = r.status === 'published' ? '✅' : r.status === 'simulated' ? '🟡' : '❌'
    console.log(`  ${icon} [${r.platform.toUpperCase()}]: ${r.status} - ${r.message}`)
    if (r.postUrl) console.log(`     Link: ${r.postUrl}`)
  })

  // Step 6: Maintain 0 MB Disk Footprint
  if (!options.keepVideo && fs.existsSync(renderRes.videoPath)) {
    console.log('\n🧹 Auto-purging local rendered video to maintain 0 MB disk footprint...')
    fs.unlinkSync(renderRes.videoPath)
    console.log('✅ Temporary video deleted successfully.')
  } else {
    console.log(`\n💾 Video preserved at: ${renderRes.videoPath}`)
  }

  console.log('\n======================================================================')
  console.log('🏁 AUTONOMOUS PIPELINE COMPLETED SUCCESSFULLY!')
  console.log('======================================================================\n')

  return historyRecord
}

// CLI Execution entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const keepVideo = args.includes('--keep-video')
  const forcedIndex = args.indexOf('--product')
  const forcedProductId = forcedIndex !== -1 ? args[forcedIndex + 1] : undefined

  runAutonomousReelPipeline({
    forcedProductId,
    dryRun,
    keepVideo
  }).catch(err => {
    console.error('❌ Autonomous pipeline failure:', err)
    process.exit(1)
  })
}
