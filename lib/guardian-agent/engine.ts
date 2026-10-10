import { z } from 'zod'
import { GuardianRequestSchema, runGuardian } from '../guardian'

export const AgentRequestSchema = z.object({
  goal: z.string().trim().min(8).max(500),
  constraints: GuardianRequestSchema.shape.constraints,
  budget: z.number().positive().finite().max(100000).optional(),
  currency: z.enum(['INR','AED','USD']).default('INR'),
  maxResults: z.number().int().min(1).max(20).default(5),
  // Evidence supplied by user or from a configured, approved catalogue connector.
  products: GuardianRequestSchema.shape.products.optional(),
  allowCatalogSearch: z.boolean().default(false),
  approvedActions: z.array(z.enum(['save_shortlist'])).max(1).default([]),
})
export type AgentRequest = z.infer<typeof AgentRequestSchema>
export type ProductEvidence = NonNullable<AgentRequest['products']>[number]
type Step = {id:number;tool:string;status:'completed'|'failed'|'skipped';description:string;at:string;durationMs:number}
export type ToolContext = {catalogSearch?: (query: string, currency:string) => Promise<ProductEvidence[]>;saveShortlist?: (ids:string[],runId:string)=>Promise<void>}

// Tool execution uses an explicit bounded workflow, not a pretend LLM reasoning trace.
// No network URLs supplied by users and no arbitrary shell/browser execution.
export async function executeGuardianAgent(request: AgentRequest, tools:ToolContext = {}) {
  const started = Date.now(); const runId=crypto.randomUUID(); const steps:Step[]=[]
  let currentStep=0
  const trace=(tool:string,status:Step['status'],description:string,start:number)=>steps.push({id:++currentStep,tool,status,description,at:new Date().toISOString(),durationMs:Date.now()-start})
  let t=Date.now()
  const plan = [
    'Establish the user goal and explicit dietary/budget constraints',
    'Retrieve eligible candidate product evidence from authorized sources',
    'Apply deterministic ingredient, allergen and budget checks',
    'Rank qualifying comparison candidates and report uncertainty',
    'Persist the shortlist only when the user has explicitly approved that action',
  ]; trace('plan', 'completed', `Created a bounded ${plan.length}-stage workflow.`,t)
  let evidence:ProductEvidence[]=[...(request.products??[])];
  let sourceMode='USER_SUPPLIED_EVIDENCE'; let retrievalError:string|null=null
  if(request.allowCatalogSearch){
    if (!tools.catalogSearch) { t=Date.now();trace('catalog_search','skipped','No authenticated catalogue connector is configured; never inventing products.',t) }
    else {
      let success=false
      for(let attempt=1;attempt<=2 && !success;attempt++){
        t=Date.now()
        try {
          const fetched=await tools.catalogSearch(request.goal,request.currency)
          // Hard bound per source to ensure deterministic resource use.
          evidence.push(...fetched.slice(0,20))
          sourceMode=evidence.length && request.products?.length?'MIXED_EVIDENCE':'CATALOG_EVIDENCE'
          success=true;trace('catalog_search','completed',`Catalogue returned ${Math.min(fetched.length,20)} product record(s); attempt ${attempt}.`,t)
        } catch(e){retrievalError=e instanceof Error?e.message:'Catalogue connection failed';trace('catalog_search','failed',`Attempt ${attempt} failed; ${attempt===1?'retrying once':'no results fabricated'}.`,t)}
      }
    }
  }
  // Duplicate identifiers from independent sources are rejected rather than silently merged.
  const unique=new Map<string,ProductEvidence>(); let duplicates=0
  for(const item of evidence){if(unique.has(item.id)){duplicates++;continue}unique.set(item.id,item)}
  evidence=[...unique.values()].slice(0,20)
  t=Date.now();trace('normalize_evidence','completed',`Prepared ${evidence.length} records; ignored ${duplicates} duplicated identifier(s).`,t)
  let evaluation:ReturnType<typeof runGuardian>|null=null
  if(evidence.length){
    t=Date.now()
    evaluation=runGuardian({goal:request.goal,constraints:request.constraints,budget:request.budget,currency:request.currency,products:evidence})
    trace('rule_based_verification','completed',`Evaluated ${evaluation.products.length} records; missing evidence stays unresolved.`,t)
  } else {t=Date.now();trace('rule_based_verification','skipped','No product evidence is available. Recommendations are impossible without evidence.',t)}
  const shortlist=(evaluation?.shortlist??[]).slice(0,request.maxResults)
  t=Date.now();trace('rank_shortlist','completed',`Ranked ${shortlist.length} unverified comparison candidate(s).`,t)
  let saved=false
  if(request.approvedActions.includes('save_shortlist')){
    t=Date.now()
    if(!tools.saveShortlist)trace('save_shortlist','skipped','Persistent storage unavailable or user not authenticated.',t)
    else try{await tools.saveShortlist(shortlist,runId);saved=true;trace('save_shortlist','completed','Saved shortlist with explicit user approval.',t)}catch{trace('save_shortlist','failed','Database write failed; shortlist was not saved.',t)}
  }
  return {runId,createdAt:new Date().toISOString(),elapsedMs:Date.now()-started,mode:'BOUNDED_AUTONOMOUS_WORKFLOW',sourceMode,plan,
    products:evaluation?.products??[],shortlist,steps, saved,retrievalError,
    safety:'A candidate is NOT an allergen-free or medically safe certification; confirm current label and manufacturer information before consuming.',
    limitations:['This version executes a bounded deterministic agent plan with tool selection and retry, not open-ended LLM planning.',
      'External catalog search works only when an approved connector is configured. Data returned by third parties is not automatically verified as manufacturer-authentic.',
      'The agent does not buy food, certify allergen safety or perform unauthorized external actions.'],
  }
}
