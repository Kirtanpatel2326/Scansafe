import { z } from 'zod'
import { GuardianRequestSchema } from '../guardian'
import type { ProductEvidence } from './engine'
const records=z.array(GuardianRequestSchema.shape.products.element).max(20)
// Integration contract: trusted partner server should expose GET /search?q=...&currency=...
// with JSON {products:[...]} using the explicit ProductEvidence schema.
export async function searchApprovedCatalog(query:string,currency:string):Promise<ProductEvidence[]>{
  const base=process.env.GUARDIAN_CATALOG_API_URL
  if(!base)throw new Error('Catalog connector not configured')
  const u=new URL(base)
  if(u.protocol!=='https:')throw new Error('Catalog API must use HTTPS')
  const endpoint=new URL(u.toString())
  endpoint.searchParams.set('q',query.slice(0,200));endpoint.searchParams.set('currency',currency)
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000)
  try{
    const res=await fetch(endpoint.toString(),{method:'GET',signal:controller.signal,headers:{...(process.env.GUARDIAN_CATALOG_API_KEY?{'Authorization':`Bearer ${process.env.GUARDIAN_CATALOG_API_KEY}`}:{})},cache:'no-store'})
    if(!res.ok)throw new Error(`Catalogue returned HTTP ${res.status}`)
    const contentLength=Number(res.headers.get('content-length')||0)
    if(contentLength>100000)throw new Error('Catalogue response exceeds size limit')
    // Bound size even without Content-Length
    const reader=res.body?.getReader();if(!reader)throw new Error('Missing response body')
    const chunks:Uint8Array[]=[];let count=0
    while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>100000){await reader.cancel();throw new Error('Catalogue response too large')}chunks.push(value)}
    const buffer=new Uint8Array(count);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length}
    const json=JSON.parse(new TextDecoder().decode(buffer)) as unknown
    return records.parse(z.object({products:records}).parse(json).products)
  }finally{clearTimeout(timer)}
}
