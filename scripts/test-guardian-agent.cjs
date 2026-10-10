const assert=require('node:assert/strict');const fs=require('node:fs');const Module=require('node:module');const ts=require('typescript');const path=require('node:path');
const chain=new Proxy(function(){},{get:(_t,p)=>p==='then'?undefined:chain,apply:()=>chain});
function load(file){const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const mod=new Module(file);mod.filename=file;mod.paths=module.paths;mod.require=name=>name==='zod'?{z:chain}:name==='../guardian'?load('lib/guardian.ts'):require(name);mod._compile(js,file);return mod.exports}
const {executeGuardianAgent}=load('lib/guardian-agent/engine.ts');
const request={goal:'Compare food for peanut allergy',constraints:['peanut'],currency:'INR',maxResults:5,allowCatalogSearch:true,approvedActions:[],products:[]};
const item=(id,ingredients,price=60)=>({id,name:id,ingredients,allergenStatement:'Contains: milk',labelComplete:true,evidenceSource:'Test synthetic evidence',price});
(async()=>{
 let attempts=0;const result=await executeGuardianAgent(request,{catalogSearch:async()=>{attempts++;if(attempts===1)throw Error('temporary');return[item('rice','rice flour'),item('nuts','peanuts, salt')];}})
 assert.equal(attempts,2);assert.deepEqual(result.shortlist,['rice']);assert.equal(result.products.find(p=>p.id==='nuts').status,'excluded');assert.equal(result.steps.filter(s=>s.tool==='catalog_search').length,2);assert.equal(result.saved,false)
 const empty=await executeGuardianAgent({...request,allowCatalogSearch:false},{})
 assert.equal(empty.shortlist.length,0);assert.equal(empty.products.length,0)
 let saves=0;const saved=await executeGuardianAgent({...request,approvedActions:['save_shortlist'],allowCatalogSearch:false,products:[item('r','rice')]},{saveShortlist:async ids=>{saves++;assert.deepEqual(ids,['r'])}})
 assert.equal(saves,1);assert.equal(saved.saved,true)
 const forbidden=await executeGuardianAgent({...request,approvedActions:[],products:[item('r','rice')],allowCatalogSearch:false},{saveShortlist:async()=>{throw Error('Should not save')}})
 assert.equal(forbidden.saved,false)
 const unsupported=await executeGuardianAgent(request,{catalogSearch:async()=>{throw Error('failure')}})
 assert.equal(unsupported.shortlist.length,0);assert.equal(unsupported.steps.filter(s=>s.status==='failed').length,2)
 console.log('PASS: agent workflow; retries; evidence handling; no-fabrication; approval gate; failed-connector recovery')
})().catch(e=>{console.error(e);process.exitCode=1})
