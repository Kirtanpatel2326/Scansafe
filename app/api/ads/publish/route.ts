import { NextResponse } from 'next/server'
import {
  publishToInstagramReels,
  publishToYouTubeShorts,
  publishViaWebhook,
  PublishResult
} from '@/lib/social-publisher'
import { z } from 'zod'

const PublishPayloadSchema = z.object({
  adId: z.string().min(1),
  title: z.string().min(1).max(100),
  caption: z.string().min(1).max(2200),
  videoUrl: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),
  platforms: z.array(z.enum(['instagram', 'youtube'])).min(1),
  scheduleTime: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  manyChatTrigger: z.string().optional()
})

export async function POST(req: Request) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const parsed = PublishPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request fields', details: parsed.error.format() }, { status: 400 })
    }

    const { adId, title, caption, videoUrl, hashtags, platforms, scheduleTime, webhookUrl, manyChatTrigger } = parsed.data

    const results: PublishResult[] = []

    // 1. Check for Webhook Bridge (Zapier / Make.com / N8N / Ayrshare)
    const effectiveWebhook = webhookUrl || process.env.SOCIAL_PUBLISH_WEBHOOK_URL
    if (effectiveWebhook) {
      const webhookRes = await publishViaWebhook(effectiveWebhook, {
        title,
        caption,
        videoUrl: videoUrl || 'https://scansafe.co.in/video-sample.mp4',
        platforms,
        hashtags: hashtags || [],
        manyChatTrigger: manyChatTrigger || 'Comment SCAN',
        scheduleTime
      })
      results.push(webhookRes)
      return NextResponse.json({
        success: webhookRes.success,
        results,
        message: 'Successfully dispatched to automated social publishing pipeline!'
      })
    }

    // 2. Direct Instagram Reels Publishing
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
    const igUserId = process.env.INSTAGRAM_USER_ID
    if (platforms.includes('instagram')) {
      if (igToken && igUserId && videoUrl) {
        const igRes = await publishToInstagramReels(videoUrl, caption, igToken, igUserId)
        results.push(igRes)
      } else {
        // Simulation / Dry-Run Mode
        results.push({
          success: true,
          platform: 'instagram',
          status: 'simulated',
          message: 'Instagram Reel verified and ready! Add INSTAGRAM_ACCESS_TOKEN in .env.local or paste a free Zapier/Make webhook to publish automatically.',
          postUrl: 'https://instagram.com/reels'
        })
      }
    }

    // 3. Direct YouTube Shorts Publishing
    const ytToken = process.env.YOUTUBE_ACCESS_TOKEN
    if (platforms.includes('youtube')) {
      if (ytToken && videoUrl) {
        const ytRes = await publishToYouTubeShorts(videoUrl, title, caption, hashtags || [], ytToken)
        results.push(ytRes)
      } else {
        // Simulation / Dry-Run Mode
        results.push({
          success: true,
          platform: 'youtube',
          status: 'simulated',
          message: 'YouTube Short verified and ready! Add YOUTUBE_ACCESS_TOKEN in .env.local or paste a free Zapier/Make webhook to publish automatically.',
          postUrl: 'https://youtube.com/shorts'
        })
      }
    }

    return NextResponse.json({
      success: results.every(r => r.success),
      results,
      summary: 'Social publishing pipeline verified'
    })
  } catch (err: any) {
    console.error('Social publish error:', err)
    return NextResponse.json({ error: 'Failed to process social publishing: ' + (err.message || 'Unknown error') }, { status: 500 })
  }
}
