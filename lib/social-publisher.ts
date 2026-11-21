/**
 * ScanSafe Social Auto-Publisher Engine
 * 
 * Programmatically publishes and schedules generated Reels and Shorts directly to:
 * 1. Instagram Reels (via official Meta Graph API v19.0 Content Publishing API)
 * 2. YouTube Shorts (via Google YouTube Data API v3)
 * 3. Unified Webhook Bridge (Zapier, Make.com, N8N, or Ayrshare for 1-click posting without OAuth overhead)
 */

export interface PublishRequest {
  adId: string
  title: string
  caption: string
  videoUrl?: string
  hashtags?: string[]
  platforms: Array<'instagram' | 'youtube'>
  scheduleTime?: string // ISO date string for scheduling
  credentials?: {
    instagram?: {
      accessToken?: string
      igUserId?: string
    }
    youtube?: {
      accessToken?: string
    }
    webhookUrl?: string
  }
}

export interface PublishResult {
  success: boolean
  platform: 'instagram' | 'youtube' | 'webhook'
  status: 'published' | 'scheduled' | 'simulated' | 'failed'
  postId?: string
  postUrl?: string
  message: string
  error?: string
}

/**
 * 1. Publish directly to Instagram Reels via official Meta Graph API
 */
export async function publishToInstagramReels(
  videoUrl: string,
  caption: string,
  accessToken: string,
  igUserId: string
): Promise<PublishResult> {
  try {
    // Step 1: Create media container for REELS
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: accessToken,
          share_to_feed: true
        })
      }
    )

    const containerData = await containerRes.json()
    if (!containerRes.ok || !containerData.id) {
      throw new Error(containerData.error?.message || 'Failed to create Instagram Reel container')
    }

    const creationId = containerData.id

    // Step 2: Poll container upload status (Meta processes video asynchronously)
    let isReady = false
    let attempts = 0
    const maxAttempts = 20

    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      attempts++

      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`
      )
      const statusData = await statusRes.json()

      if (statusData.status_code === 'FINISHED') {
        isReady = true
      } else if (statusData.status_code === 'ERROR') {
        throw new Error('Meta failed to process Instagram video stream.')
      }
    }

    if (!isReady) {
      throw new Error('Video processing timed out on Meta servers.')
    }

    // Step 3: Publish container to live Instagram feed
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken
        })
      }
    )

    const publishData = await publishRes.json()
    if (!publishRes.ok || !publishData.id) {
      throw new Error(publishData.error?.message || 'Failed to publish Instagram container')
    }

    return {
      success: true,
      platform: 'instagram',
      status: 'published',
      postId: publishData.id,
      postUrl: `https://www.instagram.com/reel/${publishData.id}/`,
      message: 'Reel published successfully to Instagram!'
    }
  } catch (err: any) {
    return {
      success: false,
      platform: 'instagram',
      status: 'failed',
      message: 'Instagram publishing failed',
      error: err.message || 'Unknown Instagram error'
    }
  }
}

/**
 * 2. Publish directly to YouTube Shorts via YouTube Data API v3
 */
export async function publishToYouTubeShorts(
  videoUrl: string,
  title: string,
  description: string,
  tags: string[],
  accessToken: string
): Promise<PublishResult> {
  try {
    // Ensure title has #Shorts tag for YouTube vertical feed categorization
    const shortsTitle = title.includes('#Shorts') ? title : `${title.slice(0, 85)} #Shorts`

    const metadata = {
      snippet: {
        title: shortsTitle,
        description: `${description}\n\nScan packaged food in 2 seconds without barcodes at https://scansafe.co.in #Shorts #FoodTruth`,
        tags: [...tags, 'Shorts', 'ScanSafe'],
        categoryId: '28' // Science & Technology / Howto
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    }

    // Initialize resumable upload session
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4'
        },
        body: JSON.stringify(metadata)
      }
    )

    if (!initRes.ok) {
      const errData = await initRes.json().catch(() => ({}))
      throw new Error(errData.error?.message || `YouTube upload initialization failed (${initRes.status})`)
    }

    const uploadUrl = initRes.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('YouTube did not return a resumable upload location URL.')
    }

    // Fetch video stream from storage and pipe to YouTube
    const videoStreamRes = await fetch(videoUrl)
    if (!videoStreamRes.ok) {
      throw new Error('Unable to download generated video to pipe to YouTube.')
    }

    const videoBuffer = await videoStreamRes.arrayBuffer()

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.byteLength.toString()
      },
      body: videoBuffer
    })

    const uploadData = await uploadRes.json()
    if (!uploadRes.ok || !uploadData.id) {
      throw new Error(uploadData.error?.message || 'Failed to complete video upload to YouTube.')
    }

    return {
      success: true,
      platform: 'youtube',
      status: 'published',
      postId: uploadData.id,
      postUrl: `https://www.youtube.com/shorts/${uploadData.id}`,
      message: 'Short uploaded successfully to YouTube Shorts!'
    }
  } catch (err: any) {
    return {
      success: false,
      platform: 'youtube',
      status: 'failed',
      message: 'YouTube Shorts upload failed',
      error: err.message || 'Unknown YouTube API error'
    }
  }
}

/**
 * 3. Unified Webhook Bridge (Zapier / Make.com / N8N / Ayrshare)
 * The fastest, zero-token way to publish to both Instagram and YouTube simultaneously
 */
export async function publishViaWebhook(
  webhookUrl: string,
  payload: {
    title: string
    caption: string
    videoUrl: string
    platforms: string[]
    hashtags: string[]
    manyChatTrigger: string
    scheduleTime?: string
  }
): Promise<PublishResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'ScanSafe Viral Studio',
        ...payload,
        timestamp: new Date().toISOString()
      })
    })

    if (!res.ok) {
      throw new Error(`Webhook responder returned HTTP status ${res.status}`)
    }

    return {
      success: true,
      platform: 'webhook',
      status: payload.scheduleTime ? 'scheduled' : 'published',
      message: `Dispatched to social publishing webhook (${payload.platforms.join(', ')})!`
    }
  } catch (err: any) {
    return {
      success: false,
      platform: 'webhook',
      status: 'failed',
      message: 'Webhook dispatch failed',
      error: err.message || 'Unknown webhook error'
    }
  }
}
