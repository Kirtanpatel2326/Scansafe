// Offline, dependency-free test of the decision engine. A minimal Zod stub is used only to load the module.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const chain = new Proxy(function(){}, { get: (_t, prop) => prop==='then' ? undefined : chain, apply: () => chain }); const stub = chain
const source = fs.readFileSync(require('node:path').join(__dirname,'../lib/guardian.ts'), 'utf8')
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const mod = new Module('guardian-test');mod.filename='guardian-test';mod.paths=module.paths;mod.require=(name)=>name==='zod'?{z:stub}:require(name);mod._compile(js,'guardian-test.js')
const run = mod.exports.runGuardian
const base={goal:'Compare options for peanut allergy',constraints:['peanut'],currency:'INR',budget:500}
function item(overrides={}){return {id:'p1',name:'Item',ingredients:'rice, sugar',allergenStatement:'Contains: milk',labelComplete:true,evidenceSource:'User-entered package text',price:90,...overrides}}
const evaluate=(p)=>run({...base,products:[p]}).products[0]
assert.equal(evaluate(item()).status,'candidate')
assert.equal(evaluate(item({ingredients:'roasted peanuts, salt'})).status,'excluded')
assert.equal(evaluate(item({allergenStatement:'May contain peanuts'})).status,'excluded')
assert.equal(evaluate(item({allergenStatement:''})).status,'needs_review')
assert.equal(evaluate(item({labelComplete:false})).status,'needs_review')
assert.equal(evaluate(item({price:900})).status,'excluded')
assert.equal(evaluate(item({ingredients:'peanut-free rice flour'})).status,'needs_review') // cannot independently verify free-from claim
assert.equal(evaluate(item({ingredients:'rice, butter',allergenStatement:'Contains milk'})).status,'candidate') // peanut-only restriction
const two=run({...base,products:[item({id:'x',price:80}),item({id:'y',price:60})]})
assert.deepEqual(two.shortlist,['y','x'])
assert.equal(two.steps.filter(s=>s.tool==='evaluate_product').length,2)
assert.equal(evaluate(item({allergenStatement:'May contain milk'})).status,'candidate') // unrelated allergen
assert.equal(evaluate(item({allergenStatement:'May contain traces of peanuts'})).status,'excluded')
assert.equal(evaluate(item({allergenStatement:'Made on shared equipment'})).status,'needs_review')
assert.equal(evaluate(item({allergenStatement:'Contains: milk; peanut-free'})).status,'needs_review')
assert.equal(evaluate(item({allergenStatement:'Contains milk; may contain egg'})).status,'candidate')
assert.equal(evaluate(item({allergenStatement:'May contain peanuts; peanut-free'})).status,'excluded')
assert.equal(evaluate(item({ingredients:'peanut-free; peanuts, salt'})).status,'excluded')
assert.equal(evaluate(item({ingredients:'rice flour',allergenStatement:'Contains: peanuts'})).status,'excluded')
console.log('PASS: 18 Guardian evidence and workflow checks')
