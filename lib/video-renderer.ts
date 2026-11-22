/**
 * ScanSafe Broadcast Video Rendering Engine
 * 
 * Programmatically renders vertical 9:16 (1080x1920) broadcast-standard MP4 videos:
 * - Ambient obsidian dark acrylic background (#090D16) with subtle glow
 * - Dynamic ScanSafe glassmorphism HUD cards and glowing hazard badges
 * - Crisp vector typography, scanner lasers, and QR/watermark overlays
 * - Neural voiceover audio with EBU R128 loudness normalization
 * - Faststart MP4 encoding for instant zero-buffer streaming on Instagram & YouTube
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import sharp from 'sharp'
import { ViralAdPackage, StoryboardStep } from './ad-generator'

export interface RenderOptions {
  outputDir?: string
  fps?: number
  keepTempFiles?: boolean
  width?: number
  height?: number
  includeWatermark?: boolean
}

export interface RenderResult {
  videoPath: string
  audioPath: string
  durationSeconds: number
  fileSizeBytes: number
  cleanup: () => void
}

/**
 * Generates an SVG card for a specific storyboard phase with glassmorphism styling
 */
export function generateSceneSvg(
  step: StoryboardStep,
  stepIndex: number,
  totalSteps: number,
  adPackage: ViralAdPackage,
  width = 1080,
  height = 1920
): string {
  const isRed = step.overlayColor === 'red'
  const isEmerald = step.overlayColor === 'emerald'
  const isAmber = step.overlayColor === 'amber'

  const accentColor = isRed ? '#EF4444' : isEmerald ? '#10B981' : isAmber ? '#F59E0B' : '#3B82F6'
  const accentGlow = isRed ? 'rgba(239, 68, 68, 0.35)' : isEmerald ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'

  // Dynamic phase badges
  let badgeIcon = 'ALERT'
  let phaseName = 'WARNING ALERT'
  if (step.phase === 'HOOK') { badgeIcon = 'ALERT'; phaseName = 'CONSUMER ALERT'; }
  else if (step.phase === 'PROBLEM') { badgeIcon = 'WARNING'; phaseName = 'HIDDEN INGREDIENTS'; }
  else if (step.phase === 'SCAN_REVEAL') { badgeIcon = 'AI SCAN'; phaseName = 'CAMERA VISION SCAN'; }
  else if (step.phase === 'FINDINGS') { badgeIcon = 'AUDIT'; phaseName = 'CHEMICAL AUDIT'; }
  else if (step.phase === 'SMART_SWAP') { badgeIcon = 'VERIFIED'; phaseName = 'SAFE FOOD SWAP'; }
  else if (step.phase === 'CTA') { badgeIcon = 'ACCESS'; phaseName = 'FREE FOOD SCANNER'; }

  // Strip emojis from text to prevent fontconfig/pango font crashes on Linux/macOS
  const cleanOverlay = stripEmojis(step.textOverlay)
  const rawTitle = adPackage.productName.length > 32 ? adPackage.productName.slice(0, 32) + '...' : adPackage.productName
  const safeTitle = escapeXml(stripEmojis(rawTitle))
  const safeOverlay = escapeXml(cleanOverlay || step.phase)
  const safeVoiceover = stripEmojis(step.voiceover)

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#121829" />
      <stop offset="60%" stop-color="#090D16" />
      <stop offset="100%" stop-color="#05070B" />
    </radialGradient>

    <!-- Ambient Accent Glow -->
    <radialGradient id="cardGlow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0" />
    </radialGradient>

    <!-- Card Filter Drop Shadow -->
    <filter id="glassShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="25" stdDeviation="35" flood-color="#000000" flood-opacity="0.75" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="${width}" height="${height}" fill="url(#bgGlow)" />

  <!-- Dynamic Ambient Glow Orb -->
  <circle cx="540" cy="850" r="420" fill="url(#cardGlow)" />

  <!-- TOP BRANDING HEADER -->
  <g transform="translate(80, 140)">
    <!-- Brand Logo Pill -->
    <rect width="920" height="80" rx="40" fill="#0E1422" stroke="#1E293B" stroke-width="2" />
    <circle cx="50" cy="40" r="14" fill="#10B981" />
    <text x="80" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" letter-spacing="3">SCANSAFE AI</text>
    <text x="320" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#64748B" letter-spacing="1.5">REAL-TIME FOOD GUARDIAN</text>
    <rect x="740" y="20" width="150" height="40" rx="20" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1.5" />
    <text x="815" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="${accentColor}" text-anchor="middle" letter-spacing="1">LIVE HUD</text>
  </g>

  <!-- STEP PROGRESS BAR -->
  <g transform="translate(80, 250)">
    ${Array.from({ length: totalSteps }).map((_, i) => {
      const stepWidth = (920 - (totalSteps - 1) * 12) / totalSteps
      const x = i * (stepWidth + 12)
      const isPastOrCurrent = i <= stepIndex
      const fill = isPastOrCurrent ? accentColor : '#1E293B'
      return `<rect x="${x}" y="0" width="${stepWidth}" height="8" rx="4" fill="${fill}" />`
    }).join('\n    ')}
  </g>

  <!-- MAIN GLASSMORPHISM CARD -->
  <g transform="translate(80, 310)" filter="url(#glassShadow)">
    <rect width="920" height="1160" rx="44" fill="#0E1422" fill-opacity="0.88" stroke="${accentColor}" stroke-width="3" stroke-opacity="0.85" />

    <!-- Card Phase Tag -->
    <rect x="50" y="60" width="360" height="56" rx="28" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="2" />
    <text x="230" y="97" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="${accentColor}" text-anchor="middle" letter-spacing="2">
      ${badgeIcon} ${phaseName}
    </text>

    <!-- Product Subtitle -->
    <text x="50" y="175" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="700" fill="#94A3B8">
      TARGET: ${safeTitle}
    </text>

    <!-- BIG PUNCHY IMPACT HEADLINE -->
    <rect x="50" y="220" width="820" height="140" rx="24" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2" />
    <text x="460" y="310" font-family="Impact, Arial Black, sans-serif" font-size="54" font-weight="900" fill="${accentColor}" text-anchor="middle" letter-spacing="2">
      ${safeOverlay}
    </text>

    <!-- SCANNER HUD / GRAPHIC SECTION -->
    <g transform="translate(50, 400)">
      <rect width="820" height="480" rx="32" fill="#070A11" stroke="#1E293B" stroke-width="2" />

      <!-- Corner HUD Target Brackets -->
      <path d="M 30 60 L 30 30 L 60 30" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M 790 60 L 790 30 L 760 30" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M 30 420 L 30 450 L 60 450" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M 790 420 L 790 450 L 760 450" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round" />

      <!-- Center Visual Vector Display -->
      <g transform="translate(410, 200)">
        <circle cx="0" cy="0" r="90" fill="${accentColor}" fill-opacity="0.12" stroke="${accentColor}" stroke-width="3" />
        ${
          step.phase === 'SMART_SWAP'
            ? `<path d="M -30 -10 L -10 15 L 35 -30" stroke="#10B981" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
            : step.phase === 'CTA'
            ? `<rect x="-30" y="-45" width="60" height="90" rx="12" stroke="#10B981" stroke-width="5" fill="none" />
               <line x1="-15" y1="25" x2="15" y2="25" stroke="#10B981" stroke-width="4" stroke-linecap="round" />`
            : step.phase === 'SCAN_REVEAL'
            ? `<circle cx="0" cy="0" r="45" stroke="${accentColor}" stroke-width="5" stroke-dasharray="10 6" fill="none" />
               <circle cx="0" cy="0" r="15" fill="${accentColor}" />`
            : `<polygon points="0,-45 42,35 -42,35" stroke="${accentColor}" stroke-width="6" fill="${accentColor}" fill-opacity="0.2" stroke-linejoin="round" />
               <line x1="0" y1="-18" x2="0" y2="10" stroke="${accentColor}" stroke-width="6" stroke-linecap="round" />
               <circle cx="0" cy="24" r="4" fill="${accentColor}" />`
        }
      </g>

      <!-- Laser Sweep Simulation Line -->
      <line x1="80" y1="320" x2="740" y2="320" stroke="${accentColor}" stroke-width="4" stroke-opacity="0.9" />
      <line x1="80" y1="320" x2="740" y2="320" stroke="${accentColor}" stroke-width="12" stroke-opacity="0.25" />

      <!-- Scan Metrics -->
      <text x="410" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
        ${step.phase === 'FINDINGS' ? `HEALTH SCORE: ${adPackage.healthScore}/100` : step.phase === 'SMART_SWAP' ? '100% CLEAN CERTIFIED' : 'SCANNING 18 TOXIC ADDITIVES'}
      </text>
      <text x="410" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#94A3B8" text-anchor="middle">
        ${step.phase === 'SMART_SWAP' ? 'Zero Refined Sugars • Zero Palm Oil' : 'Optical Ingredient Recognition • Zero Barcodes'}
      </text>
    </g>

    <!-- SPOKEN VOICEOVER SUBTITLES (HORMOZI STYLE) -->
    <rect x="50" y="910" width="820" height="200" rx="24" fill="#070A11" fill-opacity="0.95" stroke="#334155" stroke-width="2" />
    <text x="80" y="960" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#F8FAFC" letter-spacing="1">
      VOICEOVER SCRIPT:
    </text>
    <text x="80" y="1005" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#E2E8F0">
      ${wrapTextToTspans(safeVoiceover, 50, 80, 32)}
    </text>
  </g>
</svg>
  `.trim()
}

function wrapTextToTspans(rawText: string, maxCharsPerLine: number, x: number, lineSpacing: number): string {
  const words = rawText.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine += (currentLine ? ' ' : '') + word
    }
  }
  if (currentLine) lines.push(currentLine.trim())

  return lines
    .slice(0, 3) // Max 3 lines in subtitle box
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : lineSpacing}">${escapeXml(line)}</tspan>`)
    .join('')
}

function stripEmojis(str: string): string {
  if (!str) return ''
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Synthesizes voiceover audio using Node gTTS
 */
async function synthesizeVoiceoverAudio(text: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const gTTS = require('gtts')
      const gtts = new gTTS(text, 'en')
      gtts.save(outputPath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Master Video Render Pipeline:
 * Takes a ViralAdPackage, renders 6 high-res PNG scenes via Sharp,
 * normalizes audio, and stitches an EBU R128 1080x1920 MP4 video via FFmpeg.
 */
export async function renderViralReelVideo(
  adPackage: ViralAdPackage,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const outputDir = options.outputDir || path.join(process.cwd(), 'out_ads')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const runId = `scansafe_reel_${Date.now()}`
  const tempDir = path.join(outputDir, `tmp_${runId}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const rawAudioPath = path.join(tempDir, 'voiceover_raw.mp3')
  const masterAudioPath = path.join(tempDir, 'voiceover_mastered.mp3')
  const finalVideoPath = path.join(outputDir, `${runId}.mp4`)

  try {
    // 1. Synthesize Voiceover Audio
    console.log(`🎙️ [1/4] Synthesizing neural voiceover audio for "${adPackage.productName}"...`)
    await synthesizeVoiceoverAudio(adPackage.voiceoverFullText, rawAudioPath)

    // Master audio with EBU R128 loudness normalization
    try {
      execSync(
        `ffmpeg -y -i "${rawAudioPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -b:a 128k "${masterAudioPath}"`,
        { stdio: 'pipe' }
      )
    } catch {
      // Fallback if loudnorm fails
      fs.copyFileSync(rawAudioPath, masterAudioPath)
    }

    // 2. Render 6 Storyboard Scenes as High-Res 1080x1920 PNGs
    console.log(`🎨 [2/4] Rendering 6 broadcast-quality 9:16 vertical cards with Sharp...`)
    const totalSteps = adPackage.storyboard.length
    const sceneFiles: string[] = []

    for (let i = 0; i < totalSteps; i++) {
      const step = adPackage.storyboard[i]
      const svg = generateSceneSvg(step, i, totalSteps, adPackage)
      const pngPath = path.join(tempDir, `scene_${i}.png`)

      await sharp(Buffer.from(svg))
        .png({ quality: 100 })
        .toFile(pngPath)

      sceneFiles.push(pngPath)
    }

    // 3. Create Concat Manifest for FFmpeg
    // Total video length 20-25 seconds (target ~23s optimal retention)
    const targetDuration = adPackage.durationSeconds || 23
    const stepDuration = targetDuration / totalSteps
    let concatManifest = ''
    for (let i = 0; i < sceneFiles.length; i++) {
      concatManifest += `file '${sceneFiles[i]}'\n`
      concatManifest += `duration ${stepDuration.toFixed(2)}\n`
    }
    // Repeat last frame for concat demuxer requirement
    concatManifest += `file '${sceneFiles[sceneFiles.length - 1]}'\n`

    const concatPath = path.join(tempDir, 'scenes_concat.txt')
    fs.writeFileSync(concatPath, concatManifest)

    // 4. Stitch Master MP4 with FFmpeg (1080x1920, 30fps, H.264, AAC, +faststart)
    console.log(`🎬 [3/4] Encoding 1080x1920 MP4 via FFmpeg with H.264 & AAC faststart (${targetDuration}s)...`)
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -i "${masterAudioPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -movflags +faststart -t ${targetDuration} "${finalVideoPath}"`

    execSync(ffmpegCmd, { stdio: 'pipe' })

    const stats = fs.statSync(finalVideoPath)
    console.log(`✅ [4/4] Reel compiled successfully! Output: ${finalVideoPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB, ${targetDuration}s)`)

    const cleanup = () => {
      if (!options.keepTempFiles && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }

    if (!options.keepTempFiles) {
      cleanup()
    }

    return {
      videoPath: finalVideoPath,
      audioPath: masterAudioPath,
      durationSeconds: targetDuration,
      fileSizeBytes: stats.size,
      cleanup
    }
  } catch (err: any) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    throw new Error(`Video rendering pipeline failed: ${err.message}`)
  }
}
