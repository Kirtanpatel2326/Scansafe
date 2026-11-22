/**
 * ScanSafe 24/7 Autonomous Multi-Agent Video & Cross-Platform Publisher
 * 
 * Invokes the 6-Agent Content Engine:
 * 1. Product Scout Agent: Picks target item & prevents duplicate reels.
 * 2. Scriptwriter Agent: Generates viral Hormozi script & ManyChat triggers.
 * 3. Visual Director Agent: Renders Apple iPhone Titanium AR Mockup frames with Sharp.
 * 4. Video Editor Agent: Masters audio to EBU R128 and renders 1080x1920 MP4 via FFmpeg.
 * 5. Social Publisher Agent: Publishes to Instagram Reels & YouTube Shorts.
 * 6. Notification Agent: Pings the founder on Telegram/Discord with live links.
 */

import { executeAutonomousContentEngine } from '../lib/agent-system'

export async function runAutonomousReelPipeline(options: {
  forcedProductId?: string
  dryRun?: boolean
  keepVideo?: boolean
}) {
  return await executeAutonomousContentEngine(options)
}

// CLI Execution entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const keepVideo = args.includes('--keep-video')
  const forcedIndex = args.indexOf('--product')
  const forcedProductId = forcedIndex !== -1 ? args[forcedIndex + 1] : undefined

  executeAutonomousContentEngine({
    forcedProductId,
    dryRun,
    keepVideo
  }).catch(err => {
    console.error('❌ Autonomous pipeline failure:', err)
    process.exit(1)
  })
}
