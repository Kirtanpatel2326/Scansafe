import { NextResponse } from 'next/server'
import { AgentRequestSchema, executeGuardianAgent } from '@/lib/guardian-agent/engine'
import { searchApprovedCatalog } from '@/lib/guardian-agent/catalog'
import { createClient } from '@/lib/supabase-server'
export const runtime='nodejs'
const MAX_BYTES=100000
export async function POST(request:Request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'JSON required'},{status:415})
  if(Number(request.headers.get('content-length')||0)>MAX_BYTES)return NextResponse.json({error:'Payload too large'},{status:413})
  try {
    const reader=request.body?.getReader();if(!reader)return NextResponse.json({error:'Empty body'},{status:400})
    const chunks:Uint8Array[]=[];let size=0
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();return NextResponse.json({error:'Payload too large'},{status:413})}chunks.push(value)}
    const buffer=new Uint8Array(size);let off=0;for(const c of chunks){buffer.set(c,off);off+=c.length}
    const parsed=AgentRequestSchema.safeParse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer)))
    if(!parsed.success)return NextResponse.json({error:'Invalid agent request',details:parsed.error.flatten()},{status:400})
    const requestData=parsed.data
    const hasDatabase=!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let userId:string|undefined
    let db:Awaited<ReturnType<typeof createClient>>|undefined
    if(hasDatabase){db=await createClient();const {data}=await db.auth.getUser();userId=data.user?.id}
    // Persistence never silently happens for anonymous requests.
    const result=await executeGuardianAgent(requestData,{
      ...(requestData.allowCatalogSearch&&process.env.GUARDIAN_CATALOG_API_URL?{catalogSearch:searchApprovedCatalog}:{}),
      ...(db&&userId?{saveShortlist:async(ids,runId)=>{const {error}=await db!.from('guardian_saved_tasks').insert({user_id:userId,run_id:runId,goal:requestData.goal,shortlist:ids});if(error)throw error}}:{}),
    })
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}})
  } catch {
    return NextResponse.json({error:'Unable to process request; ensure valid JSON and try again'},{status:400})
  }
}
