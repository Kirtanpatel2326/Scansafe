import { NextRequest, NextResponse } from 'next/server'
import { UniversalEdgeTTS } from 'edge-tts-universal'

export const maxDuration = 30 // Prevent API gateway timeouts

// Premium native female voice models for all 18 languages
const VOICE_MAPPINGS: Record<string, string> = {
  hi: 'hi-IN-SwaraNeural', // Hindi (Female)
  gu: 'gu-IN-DhwaniNeural', // Gujarati (Female)
  ta: 'ta-IN-PallaviNeural', // Tamil (Female)
  te: 'te-IN-ShrutiNeural', // Telugu (Female)
  kn: 'kn-IN-SapnaNeural', // Kannada (Female)
  mr: 'mr-IN-AarohiNeural', // Marathi (Female)
  bn: 'bn-IN-TanishaNeural', // Bengali (Female)
  es: 'es-ES-ElviraNeural', // Spanish (Female)
  fr: 'fr-FR-DeniseNeural', // French (Female)
  ar: 'ar-AE-FatimaNeural', // Arabic (Female)
  de: 'de-DE-KatjaNeural', // German (Female)
  it: 'it-IT-ElsaNeural', // Italian (Female)
  pt: 'pt-BR-FranciscaNeural', // Portuguese (Female)
  ru: 'ru-RU-SvetlanaNeural', // Russian (Female)
  ja: 'ja-JP-NanamiNeural', // Japanese (Female)
  ko: 'ko-KR-SunHiNeural', // Korean (Female)
  zh: 'zh-CN-XiaoxiaoNeural', // Chinese (Female)
  en: 'en-US-EmmaMultilingualNeural' // English (Female - Multilingual)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text')
  const rawLang = searchParams.get('lang') || 'en'
  const langKey = rawLang.startsWith('zh') ? 'zh' : rawLang

  if (!text) {
    return new NextResponse('Missing text parameter', { status: 400 })
  }

  // Cap text length to avoid voice engine errors
  const cleanText = text.slice(0, 1000)
  
  // Choose voice model
  const voice = VOICE_MAPPINGS[langKey] || VOICE_MAPPINGS.en

  try {
    const tts = new UniversalEdgeTTS(cleanText)
    tts.voice = voice
    const result = await tts.synthesize()
    
    // Convert Web Response stream or Blob back to arrayBuffer/buffer
    const arrayBuffer = await result.audio.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    })
  } catch (error: any) {
    console.error('Edge TTS generation failed, falling back to legacy gTTS:', error)
    // Legacy fallback using public translate wrapper if Edge TTS has network issue
    try {
      const { default: gTTS } = await import('gtts')
      const legacyGtts = new gTTS(cleanText, langKey.startsWith('zh') ? 'zh' : langKey)
      const nodeStream = legacyGtts.stream()
      
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => controller.enqueue(chunk))
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', (err) => controller.error(err))
        }
      })
      
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      })
    } catch (fallbackError) {
      console.error('All TTS paths failed:', fallbackError)
      return new NextResponse('Text-to-speech generation failed', { status: 500 })
    }
  }
}
