import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase-server'
export async function GET(){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return NextResponse.json({error:'Database not configured'}, {status:503})
  const db=await createClient();const {data:{user}}=await db.auth.getUser()
  if(!user)return NextResponse.json({error:'Sign in to see saved tasks'}, {status:401})
  const {data,error}=await db.from('guardian_saved_tasks').select('run_id,goal,shortlist,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
  if(error)return NextResponse.json({error:'History unavailable; apply schema_guardian.sql'},{status:503})
  return NextResponse.json({tasks:data},{headers:{'Cache-Control':'no-store'}})
}
