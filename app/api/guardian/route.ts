import { NextResponse } from 'next/server'
import { GuardianRequestSchema, runGuardian } from '@/lib/guardian'

const MAX_REQUEST_BYTES = 120_000

async function readBoundedJson(request: Request): Promise<string> {
  const stream = request.body
  if (!stream) return ''
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  const joined = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder('utf-8', { fatal: true }).decode(joined)
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON content required' }, { status: 415 })
  }
  const declaredSize = Number(request.headers.get('content-length') || 0)
  if (declaredSize > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }
  let json: unknown
  try {
    json = JSON.parse(await readBoundedJson(request))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 'Request too large' : 'Invalid JSON request' }, { status: error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 413 : 400 })
  }
  const parsed = GuardianRequestSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  const ids = parsed.data.products.map(product => product.id)
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: 'Duplicate product IDs' }, { status: 400 })
  return NextResponse.json(runGuardian(parsed.data), { headers: { 'Cache-Control': 'no-store' } })
}
