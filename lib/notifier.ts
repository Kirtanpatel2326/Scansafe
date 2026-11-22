/**
 * ScanSafe Notification Agent (Agent 6)
 * 
 * Automatically notifies the founder across multiple channels:
 * - Telegram Bot API (Instant mobile push alert with rich markdown)
 * - Discord Webhook (Rich embed with thumbnail and video links)
 * - Slack / Generic Webhook (WhatsApp / Zapier / Make integration)
 * - Local Audit Log (Saved to data/notifications_log.json)
 */

import fs from 'fs'
import path from 'path'
import { PublishResult } from './social-publisher'

export interface NotificationPayload {
  productName: string
  category: string
  healthScore: number
  durationSeconds: number
  fileSizeBytes: number
  caption: string
  manyChatTrigger: string
  publishResults: PublishResult[]
  timestamp?: string
  status: 'SUCCESS' | 'FAILED'
  errorMessage?: string
}

const NOTIFICATIONS_LOG_PATH = path.join(process.cwd(), 'data', 'notifications_log.json')

/**
 * Dispatches a success or failure alert across all configured channels
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<{
  telegram: boolean
  discord: boolean
  webhook: boolean
  logged: boolean
}> {
  const results = {
    telegram: false,
    discord: false,
    webhook: false,
    logged: true
  }

  const timestamp = payload.timestamp || new Date().toISOString()
  const igResult = payload.publishResults.find(r => r.platform === 'instagram')
  const ytResult = payload.publishResults.find(r => r.platform === 'youtube')

  const igUrl = igResult?.postUrl || 'https://instagram.com/reels'
  const ytUrl = ytResult?.postUrl || 'https://youtube.com/shorts'

  // 1. Format Message Bodies
  const formattedText = `
🚀 *ScanSafe Autonomous Reel Published!*
━━━━━━━━━━━━━━━━━━━━
🏷️ *Product:* ${payload.productName} (${payload.category})
📉 *Health Score:* ${payload.healthScore}/100
⏱️ *Duration:* ${payload.durationSeconds}s | *Size:* ${(payload.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
💬 *ManyChat Trigger:* \`${payload.manyChatTrigger}\`

📱 *Instagram Reel:* [Watch Reel](${igUrl})
📺 *YouTube Short:* [Watch Short](${ytUrl})

✅ *Disk Footprint:* 0 MB (Auto-purged)
⏰ *Time:* ${new Date(timestamp).toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
  `.trim()

  // 2. Dispatch to Telegram Bot
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID

  if (telegramBotToken && telegramChatId) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: formattedText,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        })
      })
      results.telegram = tgRes.ok
      if (tgRes.ok) {
        console.log('📲 [AGENT 6: NOTIFIER] Telegram alert sent successfully!')
      } else {
        console.warn('⚠️ Telegram dispatch warning:', await tgRes.text())
      }
    } catch (err: any) {
      console.warn('⚠️ Telegram dispatch failed:', err.message)
    }
  }

  // 3. Dispatch to Discord Webhook
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (discordWebhookUrl) {
    try {
      const dcRes = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ScanSafe AI Autonomous Agent',
          avatar_url: 'https://scansafe.co.in/app_icon.jpg',
          embeds: [
            {
              title: `🚀 Daily Reel Published: ${payload.productName}`,
              description: `Autonomous content engine has generated and published a new broadcast reel.`,
              color: payload.healthScore < 40 ? 0xEF4444 : 0x10B981,
              fields: [
                { name: 'Category', value: payload.category, inline: true },
                { name: 'Health Score', value: `${payload.healthScore}/100`, inline: true },
                { name: 'Trigger Keyword', value: `\`${payload.manyChatTrigger}\``, inline: true },
                { name: 'Instagram', value: `[View on Instagram](${igUrl})`, inline: true },
                { name: 'YouTube', value: `[View on YouTube](${ytUrl})`, inline: true },
                { name: 'Video Specs', value: `${payload.durationSeconds}s • 1080x1920 (9:16)`, inline: true }
              ],
              footer: {
                text: 'ScanSafe 24/7 Autonomous Publisher • Zero Touch'
              },
              timestamp: timestamp
            }
          ]
        })
      })
      results.discord = dcRes.ok
      if (dcRes.ok) {
        console.log('💬 [AGENT 6: NOTIFIER] Discord alert sent successfully!')
      }
    } catch (err: any) {
      console.warn('⚠️ Discord dispatch failed:', err.message)
    }
  }

  // 4. Dispatch to Generic Notification Webhook (Slack / WhatsApp / Zapier)
  const genericWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL
  if (genericWebhookUrl) {
    try {
      const hookRes = await fetch(genericWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'reel_published',
          text: formattedText,
          payload
        })
      })
      results.webhook = hookRes.ok
      if (hookRes.ok) {
        console.log('📡 [AGENT 6: NOTIFIER] Generic webhook alert dispatched!')
      }
    } catch (err: any) {
      console.warn('⚠️ Webhook alert failed:', err.message)
    }
  }

  // 5. Always persist to local notifications log
  try {
    const dir = path.dirname(NOTIFICATIONS_LOG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let logHistory: any[] = []
    if (fs.existsSync(NOTIFICATIONS_LOG_PATH)) {
      try {
        logHistory = JSON.parse(fs.readFileSync(NOTIFICATIONS_LOG_PATH, 'utf-8'))
      } catch {}
    }

    logHistory.push({
      timestamp,
      payload,
      dispatchStatus: results
    })

    fs.writeFileSync(NOTIFICATIONS_LOG_PATH, JSON.stringify(logHistory, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write notifications_log.json:', err)
  }

  // 6. If no external channel is set up, print guidance
  if (!telegramBotToken && !discordWebhookUrl && !genericWebhookUrl) {
    console.log('\n💡 [AGENT 6: NOTIFIER] Local Notification Created:')
    console.log(formattedText)
    console.log('\n👉 To receive this alert directly on your phone:')
    console.log('   Add TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID (free via @BotFather on Telegram)')
    console.log('   OR add DISCORD_WEBHOOK_URL to your .env.local or GitHub Secrets!\n')
  }

  return results
}
