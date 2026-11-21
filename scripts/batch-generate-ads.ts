/**
 * ScanSafe Automated Batch Ad Generator CLI
 * 
 * Generates a complete weekly batch of 6 viral video ad packages:
 * - 15-second high-tension scripts
 * - Storyboard cues
 * - Voiceover scripts
 * - Captions & ManyChat triggers
 * 
 * Usage: npx tsx scripts/batch-generate-ads.ts
 */

import { VIRAL_PRODUCT_PRESETS, generateViralAd } from '../lib/ad-generator'
import * as fs from 'fs'
import * as path from 'path'

async function runBatch() {
  console.log('======================================================================')
  console.log('🎬 SCANSAFE VIRAL AD ENGINE: AUTOMATED BATCH GENERATION')
  console.log('======================================================================\n')

  const outputDir = path.join(process.cwd(), 'out_ads')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const batchResults: any[] = []

  for (let i = 0; i < VIRAL_PRODUCT_PRESETS.length; i++) {
    const preset = VIRAL_PRODUCT_PRESETS[i]
    console.log(`▶ Generating Ad ${i + 1}/${VIRAL_PRODUCT_PRESETS.length}: ${preset.name} (${preset.emoji})...`)

    const adPackage = generateViralAd(
      preset.name,
      preset.ingredients,
      preset.frontClaims,
      preset.healthScore,
      preset.category
    )

    batchResults.push(adPackage)

    const mdFilename = path.join(outputDir, `reel_${i + 1}_${preset.id}.md`)
    const mdContent = `# 🎬 Viral Reel #${i + 1}: ${adPackage.productName}
**Category:** ${adPackage.category} | **Health Score:** ${adPackage.healthScore}/100 | **Duration:** 15s

---

## 🗣️ Voiceover Script (Read this or synthesize via TTS):
> "${adPackage.voiceoverFullText}"

---

## 📱 15-Second Storyboard & Visual Cues:
${adPackage.storyboard.map(s => `
### [${s.timestamp}] ${s.phase}
* **Voiceover:** "${s.voiceover}"
* **Camera / Action:** ${s.visualCue}
* **Bold Text Overlay:** \`${s.textOverlay}\`
* **Sound Effect:** \`${s.soundEffect}\`
`).join('\n')}

---

## 💬 Instagram / YouTube Shorts Caption:
\`\`\`text
${adPackage.socialPost.caption}
\`\`\`

## 📌 Pinned Comment:
\`\`\`text
${adPackage.socialPost.pinnedComment}
\`\`\`

## 🤖 ManyChat Comment Automation Rule:
* **Trigger:** ${adPackage.socialPost.manyChatAutomationTrigger}
`
    fs.writeFileSync(mdFilename, mdContent, 'utf-8')
    console.log(`  ✓ Saved to: out_ads/reel_${i + 1}_${preset.id}.md`)
  }

  console.log('\n======================================================================')
  console.log(`🎉 BATCH GENERATION COMPLETE! Generated ${batchResults.length} Viral Ad Packages.`)
  console.log(`📂 Inspect output folder: ./out_ads/`)
  console.log('======================================================================')
}

runBatch().catch(console.error)
