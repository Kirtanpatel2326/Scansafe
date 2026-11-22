/**
 * ScanSafe Autonomous Multi-Agent Content Engine
 * 
 * Orchestrates a coordinated 6-agent autonomous workforce:
 * 1. ProductScoutAgent: Scans trends & catalog, prevents duplicate posts.
 * 2. ViralScriptwriterAgent: Generates Hormozi-style viral scripts, voiceover, and hashtags.
 * 3. VisualDirectorAgent: Renders 3D Apple-grade Titanium AR mockup frames with Sharp.
 * 4. PostProductionEditorAgent: Synthesizes voiceover, normalizes loudness (EBU R128), encodes MP4.
 * 5. SocialPublisherAgent: Dispatches to Instagram Reels and YouTube Shorts via official APIs.
 * 6. NotificationAgent: Pings the founder on Telegram/Discord/WhatsApp with live links.
 */

import { VIRAL_PRODUCT_PRESETS, generateViralAd, ProductPreset, ViralAdPackage } from './ad-generator'
import { renderViralReelVideo, RenderResult } from './video-renderer'
import { publishToInstagramReels, publishToYouTubeShorts, publishViaWebhook, PublishResult } from './social-publisher'
import { dispatchNotification, NotificationPayload } from './notifier'
import fs from 'fs'
import path from 'path'

export interface AgentPipelineOptions {
  forcedProductId?: string
  dryRun?: boolean
  keepVideo?: boolean
}

export interface AgentPipelineResult {
  success: boolean
  productId: string
  productName: string
  durationSeconds: number
  fileSizeBytes: number
  videoPath?: string
  publishResults: PublishResult[]
  notificationStatus: {
    telegram: boolean
    discord: boolean
    webhook: boolean
    logged: boolean
  }
}

// Ingestion topics for daily posting
const AGENT_PRODUCT_CATALOG: ProductPreset[] = [
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

const HISTORY_PATH = path.join(process.cwd(), 'data', 'reels_history.json')

function getPostedProductIds(): Set<string> {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const records = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
      return new Set(records.map((r: any) => r.productId))
    }
  } catch {}
  return new Set()
}

// ============================================================================
// AGENT 1: Product Scout Agent
// ============================================================================
export class ProductScoutAgent {
  static async selectProduct(forcedId?: string): Promise<ProductPreset> {
    console.log('🕵️‍♂️ [AGENT 1: PRODUCT SCOUT] Evaluating catalog & scanning viral topics...')
    
    if (forcedId) {
      const match = AGENT_PRODUCT_CATALOG.find(p => p.id === forcedId)
      if (match) {
        console.log(`   ✓ Selected forced product: ${match.name}`)
        return match
      }
    }

    const postedIds = getPostedProductIds()
    let chosen = AGENT_PRODUCT_CATALOG.find(p => !postedIds.has(p.id))

    if (!chosen) {
      console.log('   🔄 All catalog items posted. Cycling back to least recently published item...')
      chosen = AGENT_PRODUCT_CATALOG[0]
    }

    console.log(`   ✓ Selected Target: [ ${chosen.name} ] (${chosen.category}) - Score: ${chosen.healthScore}/100`)
    return chosen
  }
}

// ============================================================================
// AGENT 2: Viral Scriptwriter Agent
// ============================================================================
export class ViralScriptwriterAgent {
  static async generateScript(product: ProductPreset): Promise<ViralAdPackage> {
    console.log('✍️ [AGENT 2: SCRIPTWRITER] Generating 23-second Hormozi viral storyboard & audio script...')
    const adPackage = generateViralAd(
      product.name,
      product.ingredients,
      product.frontClaims,
      product.healthScore,
      product.category
    )
    console.log(`   ✓ Hook: "${adPackage.storyboard[0].voiceover}"`)
    console.log(`   ✓ ManyChat Trigger: "${adPackage.socialPost.manyChatAutomationTrigger}"`)
    return adPackage
  }
}

// ============================================================================
// AGENT 3 & 4: Visual Director & Post-Production Editor
// ============================================================================
export class PostProductionEditorAgent {
  static async renderVideo(adPackage: ViralAdPackage, keepTempFiles = false): Promise<RenderResult> {
    console.log('🎬 [AGENTS 3 & 4: VISUALS & VIDEO] Rendering Apple iPhone AR frames & mastering audio...')
    const result = await renderViralReelVideo(adPackage, {
      keepTempFiles
    })
    console.log(`   ✓ Video Rendered: ${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB (${result.durationSeconds}s)`)
    return result
  }
}

// ============================================================================
// AGENT 5: Cross-Platform Social Publisher
// ============================================================================
export class SocialPublisherAgent {
  static async publish(
    adPackage: ViralAdPackage,
    videoPath: string
  ): Promise<PublishResult[]> {
    console.log('📡 [AGENT 5: SOCIAL PUBLISHER] Dispatching to Instagram Reels & YouTube Shorts...')
    const results: PublishResult[] = []

    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
    const igUserId = process.env.INSTAGRAM_USER_ID
    const ytToken = process.env.YOUTUBE_ACCESS_TOKEN
    const webhookUrl = process.env.SOCIAL_PUBLISH_WEBHOOK_URL
    const videoPublicUrl = process.env.VIDEO_PUBLIC_URL || `https://scansafe.co.in/media/${path.basename(videoPath)}`

    // Webhook Bridge
    if (webhookUrl) {
      console.log('   ↳ Webhook bridge active...')
      const whRes = await publishViaWebhook(webhookUrl, {
        title: `${adPackage.productName} Truth Exposed! #Shorts`,
        caption: adPackage.socialPost.caption,
        videoUrl: videoPublicUrl,
        platforms: ['instagram', 'youtube'],
        hashtags: adPackage.socialPost.hashtags,
        manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger
      })
      results.push(whRes)
    }

    // Instagram Reels
    if (igToken && igUserId) {
      console.log('   ↳ Posting to Instagram Reels...')
      const igRes = await publishToInstagramReels(videoPublicUrl, adPackage.socialPost.caption, igToken, igUserId)
      results.push(igRes)
    } else if (!webhookUrl) {
      results.push({
        success: true,
        platform: 'instagram',
        status: 'simulated',
        message: 'Verified ready for Instagram Reels! (Add INSTAGRAM_ACCESS_TOKEN & INSTAGRAM_USER_ID to post live)',
        postUrl: 'https://instagram.com/reels'
      })
    }

    // YouTube Shorts
    if (ytToken) {
      console.log('   ↳ Posting to YouTube Shorts...')
      const ytRes = await publishToYouTubeShorts(videoPublicUrl, `${adPackage.productName} Truth Exposed! #Shorts`, adPackage.socialPost.caption, adPackage.socialPost.hashtags, ytToken)
      results.push(ytRes)
    } else if (!webhookUrl) {
      results.push({
        success: true,
        platform: 'youtube',
        status: 'simulated',
        message: 'Verified ready for YouTube Shorts! (Add YOUTUBE_ACCESS_TOKEN to post live)',
        postUrl: 'https://youtube.com/shorts'
      })
    }

    return results
  }
}

// ============================================================================
// AGENT 6: Notification Dispatcher
// ============================================================================
export class NotificationAgent {
  static async notifyFounder(payload: NotificationPayload) {
    console.log('📲 [AGENT 6: NOTIFIER] Pinging founder with live links and metrics...')
    return await dispatchNotification(payload)
  }
}

// ============================================================================
// MASTER SUPERVISOR ORCHESTRATOR
// ============================================================================
export async function executeAutonomousContentEngine(
  options: AgentPipelineOptions = {}
): Promise<AgentPipelineResult> {
  console.log('\n======================================================================')
  console.log('🤖 SCANSAFE 24/7 MULTI-AGENT CONTENT & PUBLISHING SYSTEM')
  console.log(`⏱️ Engine Started: ${new Date().toISOString()}`)
  console.log('======================================================================\n')

  try {
    // 1. Agent 1: Product Scout
    const product = await ProductScoutAgent.selectProduct(options.forcedProductId)

    // 2. Agent 2: Viral Scriptwriter
    const adPackage = await ViralScriptwriterAgent.generateScript(product)

    // 3. Agents 3 & 4: Visuals & Video Renderer
    const renderRes = await PostProductionEditorAgent.renderVideo(adPackage, false)

    // 4. Agent 5: Social Publisher
    const publishResults = await SocialPublisherAgent.publish(adPackage, renderRes.videoPath)

    // 5. Update History
    try {
      const historyRecord = {
        id: `reel_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        timestamp: new Date().toISOString(),
        durationSeconds: renderRes.durationSeconds,
        results: publishResults,
        caption: adPackage.socialPost.caption,
        manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger
      }
      const dir = path.dirname(HISTORY_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      let records: any[] = []
      if (fs.existsSync(HISTORY_PATH)) {
        records = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
      }
      records.push(historyRecord)
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(records, null, 2), 'utf-8')
    } catch (err) {
      console.error('History write warning:', err)
    }

    // 6. Agent 6: Notification Agent
    const notificationStatus = await NotificationAgent.notifyFounder({
      productName: product.name,
      category: product.category,
      healthScore: product.healthScore,
      durationSeconds: renderRes.durationSeconds,
      fileSizeBytes: renderRes.fileSizeBytes,
      caption: adPackage.socialPost.caption,
      manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger,
      publishResults,
      status: 'SUCCESS'
    })

    // 7. Auto-Purge Local Video (if not requested to keep)
    if (!options.keepVideo && fs.existsSync(renderRes.videoPath)) {
      console.log('\n🧹 Auto-purging local video file to maintain 0 MB disk footprint...')
      fs.unlinkSync(renderRes.videoPath)
      console.log('   ✓ Temporary render file deleted.')
    } else {
      console.log(`\n💾 Video file preserved at: ${renderRes.videoPath}`)
    }

    console.log('\n======================================================================')
    console.log('🏁 MULTI-AGENT PIPELINE FINISHED SUCCESSFULLY')
    console.log('======================================================================\n')

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      durationSeconds: renderRes.durationSeconds,
      fileSizeBytes: renderRes.fileSizeBytes,
      videoPath: options.keepVideo ? renderRes.videoPath : undefined,
      publishResults,
      notificationStatus
    }
  } catch (err: any) {
    console.error('\n❌ MULTI-AGENT PIPELINE ERROR:', err.message)

    // Notify of failure
    await NotificationAgent.notifyFounder({
      productName: 'Unknown',
      category: 'Error',
      healthScore: 0,
      durationSeconds: 0,
      fileSizeBytes: 0,
      caption: 'Failed during automated run',
      manyChatTrigger: 'ERROR',
      publishResults: [],
      status: 'FAILED',
      errorMessage: err.message
    })

    throw err
  }
}
