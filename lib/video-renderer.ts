/**
 * ScanSafe Broadcast Video Rendering Engine
 * 
 * Programmatically renders vertical 9:16 (1080x1920) broadcast-standard MP4 videos:
 * - Ultra-sleek Apple/Figma-grade Titanium iPhone Chassis with Dynamic Island
 * - Realistic product can backdrop with camera OCR and laser scan simulation
 * - Floating AR ingredient badges (SAFE, AVOID, CAUTION) with glowing neon borders
 * - Dynamic Health Score progress meter (24/100) and Share Breakdown CTA
 * - Spoken high-retention Hormozi subtitles (zero clunky labels, zero watermarks)
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
 * Builds the base canvas SVG with titanium phone chassis and dynamic top headlines
 */
function buildBaseSvg(
  step: StoryboardStep,
  stepIndex: number,
  totalSteps: number,
  adPackage: ViralAdPackage,
  width: number,
  height: number,
  phone: { x: number; y: number; w: number; h: number; rx: number; screenX: number; screenY: number; screenW: number; screenH: number; screenRx: number }
): string {
  const isRed = step.overlayColor === 'red'
  const isEmerald = step.overlayColor === 'emerald'
  const isAmber = step.overlayColor === 'amber'
  const accentColor = isRed ? '#EF4444' : isEmerald ? '#10B981' : isAmber ? '#F59E0B' : '#10B981'

  const cleanOverlay = stripEmojis(step.textOverlay)
  const rawTitle = adPackage.productName.length > 34 ? adPackage.productName.slice(0, 34) + '...' : adPackage.productName
  const safeTitle = escapeXml(stripEmojis(rawTitle))
  const safeOverlay = escapeXml(cleanOverlay || step.phase)

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Ambient Aura -->
    <radialGradient id="bgGlow" cx="50%" cy="18%" r="72%">
      <stop offset="0%" stop-color="#064e3b" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#022c22" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#030507" stop-opacity="1" />
    </radialGradient>

    <!-- Phone Ambient Aura -->
    <filter id="phoneAura" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>

    <!-- Titanium Chassis Gradient -->
    <linearGradient id="titaniumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3f3f46" />
      <stop offset="50%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Background -->
  <rect width="${width}" height="${height}" fill="#030507" />
  <rect width="${width}" height="${height}" fill="url(#bgGlow)" />

  <!-- TOP BRANDING & SLEEK EDITORIAL HEADER -->
  <g transform="translate(0, 95)">
    <!-- Brand Pill -->
    <rect x="${(width - 380) / 2}" y="0" width="380" height="46" rx="23" fill="#06180E" stroke="#10B981" stroke-width="1.5" />
    <circle cx="${(width - 380) / 2 + 24}" cy="23" r="5" fill="#10B981" />
    <text x="${(width - 380) / 2 + 42}" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#10B981" letter-spacing="2.5">
      SCANSAFE AR GUARDIAN
    </text>

    <!-- Professional Editorial Headline (Apple/Broadcast Grade) -->
    <text x="${width / 2}" y="100" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5">
      ${safeOverlay}
    </text>
    <text x="${width / 2}" y="145" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#94A3B8" text-anchor="middle" letter-spacing="0.5">
      TARGET: ${safeTitle}
    </text>
  </g>

  <!-- PHONE AMBIENT GLOW AURA -->
  <rect x="${phone.x - 30}" y="${phone.y - 30}" width="${phone.w + 60}" height="${phone.h + 60}" rx="${phone.rx + 20}" fill="#10B981" fill-opacity="0.22" filter="url(#phoneAura)" />

  <!-- TITANIUM PHONE CHASSIS -->
  <rect x="${phone.x}" y="${phone.y}" width="${phone.w}" height="${phone.h}" rx="${phone.rx}" fill="url(#titaniumGrad)" stroke="#52525b" stroke-width="2.5" />
  
  <!-- SCREEN BOUNDARY CUTOUT -->
  <rect x="${phone.screenX}" y="${phone.screenY}" width="${phone.screenW}" height="${phone.screenH}" rx="${phone.screenRx}" fill="#000000" />
</svg>
  `.trim()
}

/**
 * Builds the HUD overlay SVG containing the Dynamic Island, AR pills, and subtitles
 */
function buildHudSvg(
  step: StoryboardStep,
  stepIndex: number,
  totalSteps: number,
  adPackage: ViralAdPackage,
  width: number,
  height: number,
  phone: { x: number; y: number; w: number; h: number; rx: number; screenX: number; screenY: number; screenW: number; screenH: number; screenRx: number }
): string {
  const isSwap = step.phase === 'SMART_SWAP'
  const isScanning = step.phase === 'HOOK'
  const isFindings = step.phase === 'FINDINGS' || step.phase === 'PROBLEM'

  const scoreValue = isSwap ? 94 : adPackage.healthScore
  const scoreColor = scoreValue >= 80 ? '#10B981' : scoreValue >= 50 ? '#F59E0B' : '#EF4444'
  const scorePercent = Math.min(100, Math.max(5, scoreValue)) / 100

  const statusText = isSwap 
    ? '● 100% CLEAN VERIFIED' 
    : isScanning 
    ? '● SCANNING LABEL' 
    : '● ANALYSIS COMPLETE'

  const safeVoiceover = stripEmojis(step.voiceover)

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Progress Bar Gradient -->
    <linearGradient id="scoreBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="${scoreColor}" />
    </linearGradient>
  </defs>

  <!-- SCREEN DARKENING VIGNETTE (For readable HUD overlay over can) -->
  <rect x="${phone.screenX}" y="${phone.screenY}" width="${phone.screenW}" height="${phone.screenH}" rx="${phone.screenRx}" fill="#020406" fill-opacity="0.62" />

  <!-- ================= PHONE HUD CONTENT ================= -->
  <g transform="translate(${phone.screenX}, ${phone.screenY})">
    
    <!-- Dynamic Island -->
    <g transform="translate(${(phone.screenW - 200) / 2}, 22)">
      <rect width="200" height="46" rx="23" fill="#000000" stroke="#27272a" stroke-width="1.5" />
      <circle cx="34" cy="23" r="8" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <circle cx="34" cy="23" r="3.5" fill="#0284c7" fill-opacity="0.8" />
      <circle cx="166" cy="23" r="5" fill="#10B981" />
    </g>

    <!-- Top Status Header: ┌ ● ANALYSIS COMPLETE ┐ -->
    <g transform="translate(0, 105)">
      <path d="M 38 18 L 38 0 L 56 0" stroke="#10B981" stroke-width="3" fill="none" />
      <text x="${phone.screenW / 2}" y="15" font-family="monospace" font-size="22" font-weight="900" fill="#10B981" text-anchor="middle" letter-spacing="3">
        ${statusText}
      </text>
      <path d="M ${phone.screenW - 38} 18 L ${phone.screenW - 38} 0 L ${phone.screenW - 56} 0" stroke="#10B981" stroke-width="3" fill="none" />
    </g>

    <!-- FLOATING AR INGREDIENT PILLS (Matching Uploaded Figma Image Exactly) -->
    <g transform="translate(36, 155)">
      ${isSwap ? `
        <!-- CLEAN SMART SWAP INGREDIENTS -->
        <g transform="translate(0, 0)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">100% Whole Foxtail Millet</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>
        <g transform="translate(0, 74)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">Sun-Dried (Zero Palm Oil)</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>
        <g transform="translate(0, 148)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">Zero Synthetic Preservatives</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>
        <g transform="translate(0, 222)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">Zero Refined Maida</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>
        <g transform="translate(0, 296)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">Cold-Pressed Sesame Oil</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>
      ` : `
        <!-- STANDARD ULTRA-PROCESSED HAZARD BREAKDOWN -->
        <!-- Row 1: Carbonated Water (SAFE) -->
        <g transform="translate(0, 0)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#082618" fill-opacity="0.75" stroke="#2DD4BF" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#2DD4BF">Carbonated Water</text>
          <rect x="${phone.screenW - 72 - 110}" y="11" width="94" height="40" rx="6" fill="#2DD4BF" />
          <text x="${phone.screenW - 72 - 63}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">SAFE</text>
        </g>

        <!-- Row 2: High Sugar / Glucose (AVOID) -->
        <g transform="translate(0, 74)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#380F0F" fill-opacity="0.75" stroke="#EF4444" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#F87171">High Sugar / Glucose</text>
          <rect x="${phone.screenW - 72 - 116}" y="11" width="100" height="40" rx="6" fill="#EF4444" />
          <text x="${phone.screenW - 72 - 66}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#FFFFFF" text-anchor="middle">AVOID</text>
        </g>

        <!-- Row 3: Caramel Colour (AVOID) -->
        <g transform="translate(0, 148)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#380F0F" fill-opacity="0.75" stroke="#EF4444" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#F87171">Caramel Colour</text>
          <rect x="${phone.screenW - 72 - 116}" y="11" width="100" height="40" rx="6" fill="#EF4444" />
          <text x="${phone.screenW - 72 - 66}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#FFFFFF" text-anchor="middle">AVOID</text>
        </g>

        <!-- Row 4: Phosphoric Acid (CAUTION) -->
        <g transform="translate(0, 222)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#332008" fill-opacity="0.75" stroke="#F59E0B" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#FBBF24">Phosphoric Acid</text>
          <rect x="${phone.screenW - 72 - 130}" y="11" width="114" height="40" rx="6" fill="#FBBF24" />
          <text x="${phone.screenW - 72 - 73}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">CAUTION</text>
        </g>

        <!-- Row 5: Caffeine (CAUTION) -->
        <g transform="translate(0, 296)">
          <rect width="${phone.screenW - 72}" height="62" rx="12" fill="#332008" fill-opacity="0.75" stroke="#F59E0B" stroke-width="1.6" />
          <text x="24" y="39" font-family="monospace" font-size="20" font-weight="700" fill="#FBBF24">Caffeine</text>
          <rect x="${phone.screenW - 72 - 130}" y="11" width="114" height="40" rx="6" fill="#FBBF24" />
          <text x="${phone.screenW - 72 - 73}" y="36" font-family="monospace" font-size="17" font-weight="900" fill="#000000" text-anchor="middle">CAUTION</text>
        </g>
      `}
    </g>

    <!-- Laser Sweep Line -->
    <line x1="20" y1="565" x2="${phone.screenW - 20}" y2="565" stroke="#2DD4BF" stroke-width="3" opacity="0.9" />
    <line x1="20" y1="565" x2="${phone.screenW - 20}" y2="565" stroke="#2DD4BF" stroke-width="14" opacity="0.25" />

    <!-- BOTTOM HEALTH SCORE CARD -->
    <g transform="translate(36, ${phone.screenH - 240})">
      <rect width="${phone.screenW - 72}" height="135" rx="18" fill="#060C08" fill-opacity="0.95" stroke="#2DD4BF" stroke-width="1.4" stroke-opacity="0.4" />
      <text x="28" y="52" font-family="monospace" font-size="18" font-weight="800" fill="#2DD4BF" letter-spacing="3">HEALTH SCORE</text>
      <text x="${phone.screenW - 72 - 28}" y="62" font-family="monospace" font-size="52" font-weight="900" fill="${scoreColor}" text-anchor="end">${scoreValue}</text>
      
      <!-- Progress Track & Fill -->
      <rect x="28" y="90" width="${phone.screenW - 128}" height="12" rx="6" fill="#141c16" />
      <rect x="28" y="90" width="${(phone.screenW - 128) * scorePercent}" height="12" rx="6" fill="url(#scoreBarGrad)" />
    </g>

    <!-- ACTION BUTTON -->
    <g transform="translate(36, ${phone.screenH - 85})">
      <rect width="${phone.screenW - 72}" height="60" rx="13" fill="#061D12" fill-opacity="0.95" stroke="#2DD4BF" stroke-width="1.5" stroke-opacity="0.6" />
      
      <!-- Perfectly Centered Vector Bar Chart Icon & Monospace Text -->
      <g transform="translate(${(phone.screenW - 72 - 290) / 2}, 0)">
        <g transform="translate(0, 18)">
          <rect x="0" y="9" width="5.5" height="15" rx="1.5" fill="#3B82F6" />
          <rect x="9.5" y="4" width="5.5" height="20" rx="1.5" fill="#10B981" />
          <rect x="19" y="0" width="5.5" height="24" rx="1.5" fill="#EF4444" />
        </g>
        <text x="38" y="38" font-family="monospace" font-size="18.5" font-weight="800" fill="#2DD4BF" letter-spacing="0.5">
          ${isSwap ? 'Buy Clean Swap Instead' : 'Share Health Breakdown'}
        </text>
      </g>
    </g>

  </g>

  <!-- ================= HORMOZI DYNAMIC SUBTITLES (BOTTOM) ================= -->
  <g transform="translate(0, 1515)">
    <!-- Subtitle Card Container -->
    <rect x="60" y="0" width="${width - 120}" height="195" rx="28" fill="#070A11" fill-opacity="0.96" stroke="#334155" stroke-width="2" />
    
    <!-- Render Spoken Line with High-Contrast Typography -->
    <text x="${width / 2}" y="65" font-family="Impact, Arial Black, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
      ${isFindings ? 'HEALTH AUDIT: <tspan fill="#EF4444">TOXIC ADDITIVES</tspan>' : isSwap ? '<tspan fill="#10B981">SWITCH TO CLEAN FOOD</tspan>' : 'STOP FALLING FOR <tspan fill="#EF4444">FAKE LABELS</tspan>'}
    </text>
    <text x="${width / 2}" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="25" font-weight="700" fill="#CBD5E1" text-anchor="middle">
      ${wrapTextToTspans(safeVoiceover, 48, width / 2, 34)}
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
    .slice(0, 3)
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
 * Renders 6 broadcast-quality scenes featuring the real iPhone Titanium AR Mockup
 * and encodes an EBU R128 1080x1920 MP4 ready for Instagram Reels & YouTube Shorts.
 */
export async function renderViralReelVideo(
  adPackage: ViralAdPackage,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const width = options.width || 1080
  const height = options.height || 1920

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

  // Geometry for 1080x1920
  const phone = {
    w: 720,
    h: 1140,
    x: (width - 720) / 2, // 180
    y: 320,
    rx: 54,
    screenX: (width - 720) / 2 + 8,
    screenY: 320 + 8,
    screenW: 704,
    screenH: 1124,
    screenRx: 46
  }

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
      fs.copyFileSync(rawAudioPath, masterAudioPath)
    }

    // 2. Prepare Masked Product Can Image
    const canImagePath = path.join(process.cwd(), 'public', 'coke-can-full.png')
    const maskSvg = `<svg width="${phone.screenW}" height="${phone.screenH}">
      <rect width="${phone.screenW}" height="${phone.screenH}" rx="${phone.screenRx}" fill="#fff"/>
    </svg>`

    let maskedCanBuffer: Buffer | null = null
    if (fs.existsSync(canImagePath)) {
      maskedCanBuffer = await sharp(canImagePath)
        .resize(phone.screenW, phone.screenH, { fit: 'cover', position: 'center' })
        .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
        .toBuffer()
    }

    // 3. Render 6 Broadcast-Quality 9:16 Vertical Cards
    console.log(`🎨 [2/4] Rendering 6 broadcast-quality 9:16 vertical cards with Sharp...`)
    const totalSteps = adPackage.storyboard.length
    const sceneFiles: string[] = []

    for (let i = 0; i < totalSteps; i++) {
      const step = adPackage.storyboard[i]
      const baseSvg = buildBaseSvg(step, i, totalSteps, adPackage, width, height, phone)
      const hudSvg = buildHudSvg(step, i, totalSteps, adPackage, width, height, phone)
      const pngPath = path.join(tempDir, `scene_${i}.png`)

      const composites: sharp.OverlayOptions[] = []
      if (maskedCanBuffer) {
        composites.push({
          input: maskedCanBuffer,
          top: phone.screenY,
          left: phone.screenX,
          blend: 'over'
        })
      }
      composites.push({
        input: Buffer.from(hudSvg),
        top: 0,
        left: 0,
        blend: 'over'
      })

      await sharp(Buffer.from(baseSvg))
        .composite(composites)
        .png({ quality: 100 })
        .toFile(pngPath)

      sceneFiles.push(pngPath)
    }

    // 4. Create Concat Manifest for FFmpeg (Target 23s)
    const targetDuration = adPackage.durationSeconds || 23
    const stepDuration = targetDuration / totalSteps
    let concatManifest = ''
    for (let i = 0; i < sceneFiles.length; i++) {
      concatManifest += `file '${sceneFiles[i]}'\n`
      concatManifest += `duration ${stepDuration.toFixed(2)}\n`
    }
    concatManifest += `file '${sceneFiles[sceneFiles.length - 1]}'\n`

    const concatPath = path.join(tempDir, 'scenes_concat.txt')
    fs.writeFileSync(concatPath, concatManifest)

    // 5. Stitch Master MP4 with FFmpeg (1080x1920, 30fps, H.264, AAC, +faststart)
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
    if (!options.keepTempFiles && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    throw new Error(`Broadcast video rendering failed: ${err.message}`)
  }
}
