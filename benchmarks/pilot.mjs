import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {run as localRun} from '../scripts/run-local.mjs';

// Synthetic calibration, not a representative product-development benchmark.
const cases=[
 {id:'normalize',spec:'Export normalize(items). Require an array; otherwise throw TypeError. Keep only string elements, trim, drop empty strings, deduplicate case-sensitively, and sort using JavaScript UTF-16 lexicographic order (not localeCompare). Return a new array; never mutate input.',
 starter:'export function normalize(items) { return items; }',
 visible:"assert.deepEqual(m.normalize([' b ','a','b']),['a','b']);",
 hidden:"const x=['z','A','a','!',' A ',null,3,'','  '];const before=JSON.stringify(x);assert.deepEqual(m.normalize(x),['!','A','a','z']);assert.equal(JSON.stringify(x),before);assert.deepEqual(m.normalize([]),[]);assert.throws(()=>m.normalize(null),TypeError);assert.notEqual(m.normalize(x),x);"},
 {id:'ttl-cache',spec:'Export createCache({now,ttlMs}). now must be a function and ttlMs a finite nonnegative number; invalid options throw TypeError. Return get(key), set(key,value), delete(key), size(). Use injected millisecond clock. Entries expire when now() >= insertion time + ttlMs. get returns undefined for missing/expired. set overwrites value and resets TTL, returns undefined. delete returns whether an unexpired entry existed. size excludes all expired entries. Keys may be any Map key including objects. Undefined values are allowed and count as entries until expiration. No timers, global shared state, mutation of options, or dependencies.',
 starter:'export function createCache(options) { throw new Error("TODO"); }',
 visible:"let t=0;const c=m.createCache({now:()=>t,ttlMs:10});c.set('a',2);assert.equal(c.get('a'),2);t=10;assert.equal(c.get('a'),undefined);",
 hidden:"let t=0;const c=m.createCache({now:()=>t,ttlMs:5});const k={};c.set(k,undefined);assert.equal(c.size(),1);assert.equal(c.delete(k),true);assert.equal(c.delete(k),false);c.set('a',1);t=4;c.set('a',2);t=5;assert.equal(c.get('a'),2);t=9;assert.equal(c.size(),0);assert.equal(c.delete('a'),false);const z=m.createCache({now:()=>0,ttlMs:0});z.set(1,2);assert.equal(z.size(),0);for(const ttlMs of [-1,NaN,Infinity,'5'])assert.throws(()=>m.createCache({now:()=>0,ttlMs}),TypeError);assert.throws(()=>m.createCache({now:1,ttlMs:2}),TypeError);"},
 {id:'concurrency-map',spec:'Export async mapLimit(items,limit,worker). Require array items, positive integer limit, function worker; invalid arguments reject with TypeError. Call worker(value,index) no more than limit concurrently. Return results in original input order, including undefined values. Empty input resolves [] without worker calls. Accept synchronous and asynchronous workers. On a worker failure reject with the exact original reason, stop scheduling new items after the failure is observed, and handle all already-started promises so no unhandled rejection occurs. Never mutate input; no dependencies.',
 starter:'export async function mapLimit(items,limit,worker) { return Promise.all(items.map(worker)); }',
 visible:"assert.deepEqual(await m.mapLimit([1,2,3],2,async x=>x*2),[2,4,6]);",
 hidden:"let active=0,peak=0;const a=[3,1,2];const out=await m.mapLimit(a,2,async(x,i)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,x*4));active--;return i;});assert.deepEqual(out,[0,1,2]);assert.ok(peak<=2);assert.deepEqual(a,[3,1,2]);assert.deepEqual(await m.mapLimit([],2,()=>{throw Error('called');}),[]);assert.deepEqual(await m.mapLimit([1],1,()=>undefined),[undefined]);for(const limit of [0,-1,1.5,NaN])await assert.rejects(()=>m.mapLimit([],limit,()=>1),TypeError);const reason={failure:true};let calls=0;await assert.rejects(()=>m.mapLimit([1,2,3],1,()=>{calls++;throw reason;}),e=>e===reason);assert.equal(calls,1);"}
];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-benchmark-'));
fs.chmodSync(root,0o700);
console.log(JSON.stringify({event:'started',root,cases:cases.map(c=>c.id),localConcurrency:1}));
const save=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{mode:0o600});
const records=[];
async function cloud(work,prompt,label,writable=false){
 const started=Date.now();
 const args=['exec','--ignore-user-config','--ephemeral','--json','-s',writable?'workspace-write':'read-only','-m','gpt-5.6-terra','-c','model_reasoning_effort="low"','-C',work,prompt];
 const child=spawn('codex',args,{stdio:['ignore','pipe','pipe'],detached:true});
 let stdout='',stderr='',timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGKILL');}catch{}},240000);
 child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
 const status=await new Promise(resolve=>{child.on('error',e=>resolve({error:e.message}));child.on('close',(exitCode,signal)=>resolve({exitCode,signal}));});
 clearTimeout(timer);save(path.join(root,label+'.jsonl'),stdout);save(path.join(root,label+'.stderr'),stderr);
 const events=stdout.split('\n').filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});
 const turns=events.filter(e=>e.type==='turn.completed');
 const usage=turns.length?turns.reduce((a,e)=>{for(const[k,v]of Object.entries(e.usage||{}))a[k]=(a[k]||0)+v;return a;},{}):null;
 const text=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').map(e=>e.item.text).join('\n');
 const result={label,...status,timedOut,seconds:(Date.now()-started)/1000,usage,text};
 records.push(result);save(path.join(root,'cloud-records.json'),records);
 if(status.exitCode!==0||!usage)throw Error('Cloud instrumentation failed: '+label+'; see '+root);
 return result;
}
function check(work,c,hidden){
 const code="import assert from 'node:assert/strict';import * as m from "+JSON.stringify(path.join(work,'impl.mjs'))+";"+(hidden?c.hidden:c.visible);
 try{execFileSync('node',['--input-type=module','-e',code],{timeout:10000,stdio:['ignore','pipe','pipe']});return{pass:true};}
 catch(e){return{pass:false,error:String(e.stderr||e.message).slice(0,3000)};}
}
const sumUsage=rs=>rs.reduce((a,r)=>{for(const[k,v]of Object.entries(r.usage||{}))a[k]=(a[k]||0)+v;return a;},{});
const results=[];
for(let ci=0;ci<cases.length;ci++){
 const c=cases[ci];
 // Alternate arm order to reduce one-sided cache/order bias. One repetition remains a limitation.
 for(const arm of ci%2?['hybrid','cloud']:['cloud','hybrid']){
  const id=c.id+'-'+arm,work=path.join(root,id);fs.mkdirSync(work);execFileSync('git',['init','--quiet',work]);
  save(path.join(work,'impl.mjs'),c.starter+'\n');
  const visible="import assert from 'node:assert/strict';import * as m from './impl.mjs';"+c.visible+'\n';
  save(path.join(work,'visible.test.mjs'),visible);
  const contract=c.spec+'\nNode 22 ESM. Read only impl.mjs and visible.test.mjs. Edit only impl.mjs; optional HANDOFF.md. Never edit tests. No dependencies, network, commits, global settings or other files. Allowed shell check: node --test visible.test.mjs. Hidden checks independently test the full stated contract. Keep handoff under 150 words.';
  const start=Date.now(),recordStart=records.length,local=[];
  let feedback='',passed=false;
  for(let attempt=0;attempt<3;attempt++){
   const label=id+'-'+attempt;
   if(arm==='cloud'){
    await cloud(work,'Plan briefly, implement and test this bounded task. '+contract+'\n'+feedback,label+'-implement',true);
   }else{
    const planner=await cloud(work,'Do not use tools or implement code. Produce a compact precise local-developer task packet, under 700 words, preserving every constraint and adding useful implementation hints. '+contract+'\n'+feedback,label+'-plan');
    const ps=await fetch('http://127.0.0.1:11434/api/ps').then(r=>r.json());
    if(ps.models?.some(m=>m.name!=='qwen3-coder:30b'))throw Error('Another local model is resident; not loading Qwen concurrently');
    const task=path.join(root,label+'-TASK.md');save(task,contract+'\nFrontier guidance:\n'+planner.text+'\n'+feedback+'\nRun the approved check and then write a concise HANDOFF.md and STOP.');
    const packet=path.join(root,label+'-packet.json');
    save(packet,{workspace:work,task,output:path.join(root,label+'-local'),model:'qwen3-coder:30b',context:16384,outputTokens:4096,writeFiles:['impl.mjs','HANDOFF.md'],commands:['node --test visible.test.mjs'],disabledMcp:['aws-mcp'],reviewedConfig:true,timeoutSeconds:240,maxToolEvents:20});
    const lr=await localRun(packet);local.push(lr);
   }
   const visibleResult=check(work,c,false),hiddenResult=check(work,c,true);
   const integrity=fs.readFileSync(path.join(work,'visible.test.mjs'),'utf8')===visible;
   const source=fs.readFileSync(path.join(work,'impl.mjs'),'utf8');
   const review=await cloud(work,'Do not use tools or edit files. Independently review this implementation against the full contract and supplied external test evidence. Start with ACCEPT or REWORK, then at most 150 words of concrete issues. Do not approve failed checks.\nCONTRACT:\n'+contract+'\nIMPLEMENTATION:\n'+source+'\nEXTERNAL EVIDENCE:\n'+JSON.stringify({visibleResult,hiddenResult,testIntegrity:integrity}),label+'-review');
   passed=visibleResult.pass&&hiddenResult.pass&&integrity&&/^ACCEPT\b/.test(review.text.trim());
   if(passed)break;
   feedback='Repair only the remaining failure. Prior review and external evidence:\n'+review.text+'\n'+JSON.stringify({visibleResult,hiddenResult,integrity});
  }
  const result={case:c.id,arm,passed,seconds:(Date.now()-start)/1000,cloud:sumUsage(records.slice(recordStart)),cloudPhases:records.length-recordStart,local:local.map(r=>({state:r.state,seconds:r.elapsedSeconds,tokens:r.tokens,toolEvents:r.toolEvents})),work};
  results.push(result);save(path.join(root,'results.json'),results);console.log(JSON.stringify({event:'arm-complete',...result}));
 }
}
const totals=Object.fromEntries(['cloud','hybrid'].map(arm=>[arm,sumUsage(results.filter(r=>r.arm===arm).map(r=>({usage:r.cloud})))]));
const total=u=>(u.input_tokens||0)+(u.output_tokens||0);
const report={pilot:true,root,results,totals,cloudTokenReduction:1-total(totals.hybrid)/total(totals.cloud),allPassed:results.every(r=>r.passed),costReduction:null,limitations:['Three synthetic tasks, one paired repetition each; not representative production evidence.','Counts instrumented implementation/planning/review/repair phases; excludes benchmark construction and this supervisory conversation.','Client-reported usage; input includes cached tokens, cache counters are separate breakdowns, not additive.','No price assumptions or subscription-dollar savings claimed.','Separate fresh cloud phases; compare persistent-session orchestration before generalizing.','No automatic context overflow or chain recovery benchmark in this pilot.']};
save(path.join(root,'report.json'),report);console.log(JSON.stringify({event:'finished',root,totals,cloudTokenReduction:report.cloudTokenReduction,allPassed:report.allPassed}));
