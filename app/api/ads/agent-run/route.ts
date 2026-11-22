import { NextResponse } from 'next/server'
import { executeAutonomousContentEngine } from '@/lib/agent-system'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Allow empty body
    }

    const { forcedProductId, dryRun, keepVideo } = body

    const result = await executeAutonomousContentEngine({
      forcedProductId,
      dryRun: Boolean(dryRun),
      keepVideo: Boolean(keepVideo)
    })

    return NextResponse.json({
      success: true,
      message: 'Autonomous 6-agent content pipeline executed successfully!',
      result
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Autonomous agent execution failed'
      },
      { status: 500 }
    )
  }
}
