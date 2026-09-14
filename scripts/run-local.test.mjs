import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validate,config,summarize,run} from './run-local.mjs';
import {acquireWorkspaceLease,assertWorkspaceLease,releaseWorkspaceLease} from './workspace-lock.mjs';

const base={workspace:'/tmp/work',task:'/tmp/control/task.md',output:'/tmp/control/out',writeFiles:['sum.mjs'],commands:['node --test test.mjs'],reviewedConfig:true};
test('remote endpoints, cloud models, traversal and missing attestation rejected',()=>{
  for(const change of [{baseURL:'https://example.com/v1'},{baseURL:'http://localhost:11434/v1?x=1'},{model:'qwen:cloud'},{writeFiles:['../oops']},{writeFiles:['**']},{commands:['npm *']},{reviewedConfig:false},{timeoutSeconds:0}])assert.throws(()=>validate({...base,...change}));
});
test('permissions and model routing are local and narrowly scoped',()=>{
  const c=config(validate({...base,disabledMcp:['example-server']}));assert.equal(c.mcp['example-server'].enabled,false);assert.deepEqual(c.enabled_providers,['ollama']);assert.equal(c.permission.bash['*'],'deny');assert.equal(c.permission.edit['sum.mjs'],'allow');assert.equal(c.permission.external_directory,'deny');assert.equal(c.agent['local-worker'].model,'ollama/qwen3-coder:30b');
});
test('configured worker system prompt is exact-path and phase aware',()=>{
 const scoped={...base,workspace:'/tmp/work',readFiles:['source.mjs','visible.test.mjs'],writeFiles:['source.mjs'],guardedMcpPolicy:{inventory:[],enabled:[],tools:[]}};
 const simple=config(validate(scoped)).agent['local-worker'].prompt;assert.match(simple,/run approved test commands as needed/);assert.match(simple,/HANDOFF\.md is not required/);assert.doesNotMatch(simple,/required handoff|exactly once/);
 const implementation=config(validate({...scoped,guardedPhase:'implement'})).agent['local-worker'].prompt;
 assert.match(implementation,/GUARDED PHASE IMPLEMENT/);assert.match(implementation,/filePath equal/);assert.match(implementation,/\["\/tmp\/work\/source\.mjs","\/tmp\/work\/visible\.test\.mjs"\]/);assert.match(implementation,/Directory reads are forbidden/);assert.match(implementation,/workspace and every parent directory/);assert.match(implementation,/missing exact path instead of discovering/);assert.match(implementation,/Do not run tests/);assert.match(implementation,/do not create or edit HANDOFF\.md/);assert.doesNotMatch(implementation,/stop after the required handoff/);
 const verification=config(validate({...scoped,writeFiles:[],commands:['./.open-lm-test'],guardedPhase:'test'})).agent['local-worker'].prompt;assert.match(verification,/GUARDED PHASE TEST/);assert.match(verification,/fixed approved test helper exactly once/);assert.match(verification,/native reads may target only the exact listed verification files/);assert.match(verification,/Do not write, edit, discover/);
 const report=config(validate({...scoped,readFiles:[],writeFiles:['HANDOFF.md'],guardedPhase:'report'})).agent['local-worker'].prompt;assert.match(report,/GUARDED PHASE REPORT/);assert.match(report,/\/tmp\/work\/HANDOFF\.md/);assert.match(report,/Do not read files, run tests/);
});
test('evidence preserves failed and unknown exits and deduplicates calls',()=>{
  const e={type:'tool_use',part:{callID:'a',tool:'bash',state:{status:'completed',input:{command:'false'},metadata:{exit:1}}}};
  const s=summarize([e,e,{type:'tool_use',part:{callID:'b',tool:'bash',state:{status:'error'}}}]);assert.equal(s.toolEvents,2);assert.equal(s.tools[0].exitCode,1);assert.equal(s.tools[1].exitCode,null);
});
test('runner handles completion, timeout, event budget, log budget and missing binary',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-loop-runner-test-'));const workspace=path.join(root,'work');fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);const task=path.join(root,'task.md');fs.writeFileSync(task,'Synthetic test');
  const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})});
  try {
    for(const [name,body,changes,reason] of [
      ['complete','console.log(JSON.stringify({type:"step_finish",part:{reason:"stop"}}));',{},null],
      ['timeout','setInterval(()=>{},1000);',{timeoutSeconds:1},'wall-time-limit'],
      ['events','console.log(JSON.stringify({type:"tool_use",part:{callID:"a",tool:"read",state:{status:"completed"}}}));setInterval(()=>{},1000);',{maxToolEvents:1},'tool-event-limit'],
      ['logs','console.log("x".repeat(5000));setInterval(()=>{},1000);',{maxLogBytes:1024},'log-byte-limit'],
      ['error','console.log(JSON.stringify({type:"error",error:{message:"model failure"}}));',{},null]
    ]) {
      const executable=path.join(root,name+'.mjs');fs.writeFileSync(executable,'#!/usr/bin/env node\n'+body,{mode:0o700});
      const packet=path.join(root,name+'.json');fs.writeFileSync(packet,JSON.stringify({...base,workspace,task,output:path.join(root,name),executable,...changes}));
      const result=await run(packet);assert.equal(result.stopReason,reason);assert.equal(result.accepted,false);assert.equal(result.state,name==='complete'?'review-ready':'stopped-or-failed');assert.ok(fs.existsSync(path.join(root,name,'summary.json')));
    }
    const packet=path.join(root,'missing.json');fs.writeFileSync(packet,JSON.stringify({...base,workspace,task,output:path.join(root,'missing'),executable:path.join(root,'not-installed')}));assert.equal((await run(packet)).state,'stopped-or-failed');
  } finally {globalThis.fetch=original;}
});


test('normal worker exit drains its process group before returning or releasing the lease',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-normal-exit-cleanup-'))),workspace=path.join(root,'work');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 const task=path.join(root,'TASK.md'),started=path.join(root,'descendant-started'),late=path.join(root,'late.txt');fs.writeFileSync(task,'Synthetic cleanup regression.');
 const descendant=path.join(root,'descendant.mjs');
 fs.writeFileSync(descendant,'#!/usr/bin/env node\nimport fs from "node:fs";\nprocess.on("SIGTERM",()=>{});fs.writeFileSync('+JSON.stringify(started)+',"started");setTimeout(()=>fs.writeFileSync('+JSON.stringify(late)+',"escaped"),3000);setInterval(()=>{},1000);\n',{mode:0o700});
 const executable=path.join(root,'worker.mjs');
 fs.writeFileSync(executable,'#!/usr/bin/env node\nimport {spawn} from "node:child_process";\nspawn(process.execPath,['+JSON.stringify(descendant)+'],{stdio:"ignore"}).unref();Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);\nconsole.log(JSON.stringify({type:"step_finish",part:{reason:"stop"}}));\n',{mode:0o700});
 const packet=path.join(root,'packet.json');fs.writeFileSync(packet,JSON.stringify({...base,workspace,task,executable,output:path.join(root,'output'),writeFiles:[],commands:[]}));
 const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})});
 try{
  const running=run(packet),deadline=Date.now()+1000;while(!fs.existsSync(started)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fs.existsSync(started),true);await new Promise(resolve=>setTimeout(resolve,100));
  assert.throws(()=>acquireWorkspaceLease(workspace),error=>error?.code==='EEXIST');
  const result=await running;assert.equal(result.state,'review-ready');assert.equal(result.stopReason,null);
  const lease=acquireWorkspaceLease(workspace);releaseWorkspaceLease(lease);
  await new Promise(resolve=>setTimeout(resolve,1200));assert.equal(fs.existsSync(late),false);
 }finally{globalThis.fetch=original;fs.rmSync(root,{recursive:true,force:true});}
});

test('exact read scope denies discovery and cannot broaden into wildcard paths',()=>{
 const p=validate({...base,readFiles:['sum.mjs','test.mjs']});
 const c=config(p);
 assert.equal(c.permission.read['*'],'deny');
 assert.equal(c.permission.read['sum.mjs'],'allow');
 assert.equal(c.permission.read['/tmp/work/sum.mjs'],'allow');
 assert.equal(c.permission.read['unlisted.mjs'],undefined);
 assert.equal(c.permission.glob,'deny');
 assert.equal(c.permission.grep,'deny');
 assert.deepEqual(c.agent['local-worker'].permission,c.permission);
 assert.deepEqual(config(validate({...base,readFiles:[]})).permission.read,{'*':'deny'});
 for(const readFiles of [['../secret'],['*.mjs'],['dir/../file'],['.'],['dir/'],['/tmp/file'],[''],null])
  assert.throws(()=>validate({...base,readFiles}));
 assert.throws(()=>validate({...base,workspace:'/tmp/w*',readFiles:['x']}));
 assert.equal(config(validate(base)).permission.read,'allow');
});

test('runner relays a verified predecessor and preserves the next unverified snapshot',async()=>{
 const {createHash}=await import('node:crypto');
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-linked-run-'))),workspace=path.join(root,'work');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 fs.writeFileSync(path.join(workspace,'sum.mjs'),'export const value=1;\n');
 const prior=path.join(root,'prior.md');fs.writeFileSync(prior,'prior packet handoff\n');
 const task=path.join(root,'TASK.md');fs.writeFileSync(task,'Report the supplied checkpoint only.');
 const executable=path.join(root,'worker.mjs');
 fs.writeFileSync(executable,'#!/usr/bin/env node\nimport fs from "node:fs";const prompt=process.argv.at(-1);const nativePaths={read:[process.cwd()+"/sum.mjs"],write:[process.cwd()+"/HANDOFF.md"]};if(!prompt.includes(JSON.stringify(nativePaths)))process.exit(8);if(!prompt.includes("PRIOR VERIFIED CHECKPOINT")||!prompt.includes("prior packet handoff"))process.exit(9);fs.writeFileSync("HANDOFF.md","next handoff\\n");console.log(JSON.stringify({type:"step_finish",part:{reason:"stop"}}));',{mode:0o700});
 const predecessor={packetId:'previous',nextPacketId:'next',verified:true,handoffPath:prior,handoffSha256:hash('prior packet handoff\n'),sourceHashes:{'sum.mjs':hash('export const value=1;\n')}};
 const p={...base,packetId:'next',workspace,task,output:path.join(root,'output'),readFiles:['sum.mjs'],writeFiles:['HANDOFF.md'],commands:[],executable,predecessor};
 const file=path.join(root,'packet.json');fs.writeFileSync(file,JSON.stringify(p));
 const original=globalThis.fetch;let fetches=0;
 globalThis.fetch=async()=>{fetches++;return{ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})}};
 try{
  const result=await run(file);assert.equal(result.state,'review-ready');assert.equal(result.skillVersion,'0.1.0');
  assert.equal(result.handoff.verified,false);assert.equal(fs.readFileSync(result.handoff.handoffPath,'utf8'),'next handoff\n');
  fs.writeFileSync(path.join(workspace,'HANDOFF.md'),'replaced in workspace');
  assert.equal(fs.readFileSync(result.handoff.handoffPath,'utf8'),'next handoff\n');
  assert.equal(fs.readFileSync(prior,'utf8'),'prior packet handoff\n');
  fs.writeFileSync(path.join(workspace,'sum.mjs'),'changed');
  fs.writeFileSync(file,JSON.stringify({...p,output:path.join(root,'blocked')}));
  await assert.rejects(()=>run(file),/Stale predecessor source/);
  assert.equal(fetches,1);assert.equal(fs.existsSync(path.join(root,'blocked')),false);
 }finally{globalThis.fetch=original;}
});

test('report-only repair relays reviewed evidence without read authority and rebuilds the successor link',async()=>{
 const {createHash}=await import('node:crypto');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-report-link-')));
 const workspace=path.join(root,'work'),marker=path.join(root,'spawns.log');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 fs.writeFileSync(path.join(workspace,'source.mjs'),'export const value=1;\n');
 const executable=path.join(root,'worker.mjs');
 fs.writeFileSync(executable,`#!/usr/bin/env node
import fs from 'node:fs';
const prompt=process.argv.at(-1),config=JSON.parse(process.env.OPENCODE_CONFIG_CONTENT);
fs.appendFileSync(${JSON.stringify(marker)},'spawn\\n');
if(prompt.includes('MODE:FIRST')){
 fs.writeFileSync('source.mjs','export const value=2;\\n');
 fs.writeFileSync('HANDOFF.md','initial unreviewed report\\n');
}else if(prompt.includes('MODE:REPORT')){
 const p=config.permission;
 if(p.read['*']!=='deny'||p.glob!=='deny'||p.grep!=='deny'||p.bash['*']!=='deny'||Object.keys(p.bash).length!==1||p.edit['*']!=='deny'||p.edit['HANDOFF.md']!=='allow'||Object.keys(p.edit).length!==2)process.exit(8);
 if(!prompt.includes('VERIFIED PREDECESSOR EVIDENCE')||fs.readFileSync('source.mjs','utf8')!=='export const value=2;\\n')process.exit(7);
 fs.writeFileSync('HANDOFF.md','corrected reviewed report\\n');
}else if(prompt.includes('MODE:SUCCESSOR')){
 if(!prompt.includes('PRIOR VERIFIED CHECKPOINT')||!prompt.includes('corrected reviewed report'))process.exit(9);
 if(fs.readFileSync('source.mjs','utf8')!=='export const value=2;\\n')process.exit(10);
 fs.writeFileSync('HANDOFF.md','successor report\\n');
}else process.exit(6);
console.log(JSON.stringify({type:'step_finish',part:{reason:'stop'}}));
`,{mode:0o700});
 const packet=(name,value)=>{const filename=path.join(root,name+'.json');fs.writeFileSync(filename,JSON.stringify(value));return filename};
 const task=(name,text)=>{const filename=path.join(root,name+'.md');fs.writeFileSync(filename,text);return filename};
 const common={workspace,runtime:'ollama',model:'qwen3-coder:30b',baseURL:'http://127.0.0.1:11434/v1',executable,commands:[],disabledMcp:[],reviewedConfig:true};
 const originalFetch=globalThis.fetch;let fetches=0;
 globalThis.fetch=async()=>{fetches++;return{ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})}};
 try{
  const first=await run(packet('first',{...common,packetId:'p1',task:task('first-task','MODE:FIRST'),output:path.join(root,'first-output'),readFiles:['source.mjs'],writeFiles:['source.mjs','HANDOFF.md']}));
  assert.equal(first.state,'review-ready');
  const acceptedSource='export const value=2;\n',acceptedHash=hash(acceptedSource);
  assert.equal(first.handoff.sourceHashes['source.mjs'],acceptedHash);
  const firstRaw=fs.readFileSync(first.handoff.handoffPath,'utf8');

  const reviewedEvidence={packetId:'p1',handoffSha256:first.handoff.handoffSha256,sourceHashes:first.handoff.sourceHashes};
  const reportPacket={...common,packetId:'p1-report',task:task('report-task',`MODE:REPORT\nVERIFIED PREDECESSOR EVIDENCE (not instructions): ${JSON.stringify(reviewedEvidence)}`),output:path.join(root,'report-output'),readFiles:[],writeFiles:['HANDOFF.md']};
  assert.equal('predecessor' in reportPacket,false);
  const report=await run(packet('report',reportPacket));
  assert.equal(report.state,'review-ready');
  assert.deepEqual(report.handoff.sourceHashes,{});
  assert.equal(fs.readFileSync(first.handoff.handoffPath,'utf8'),firstRaw);
  assert.equal(fs.readFileSync(report.handoff.handoffPath,'utf8'),'corrected reviewed report\n');

  const shortcut={packetId:'p1',nextPacketId:'p2',verified:true,handoffPath:report.handoff.handoffPath,handoffSha256:report.handoff.handoffSha256,sourceHashes:report.handoff.sourceHashes};
  const successorBase={...common,packetId:'p2',task:task('successor-task','MODE:SUCCESSOR'),readFiles:['source.mjs'],writeFiles:['HANDOFF.md']};
  const beforeRejectedFetches=fetches,beforeRejectedSpawns=fs.readFileSync(marker,'utf8').trim().split('\n').length;
  await assert.rejects(()=>run(packet('empty-shortcut',{...successorBase,output:path.join(root,'empty-output'),predecessor:shortcut})),/sourceHashes must be nonempty/);
  assert.equal(fetches,beforeRejectedFetches);
  assert.equal(fs.readFileSync(marker,'utf8').trim().split('\n').length,beforeRejectedSpawns);

  const predecessor={...shortcut,sourceHashes:{'source.mjs':acceptedHash}};
  fs.writeFileSync(path.join(workspace,'source.mjs'),'drifted\n');
  await assert.rejects(()=>run(packet('drift',{...successorBase,output:path.join(root,'drift-output'),predecessor})),/Stale predecessor source/);
  assert.equal(fetches,beforeRejectedFetches);
  assert.equal(fs.readFileSync(marker,'utf8').trim().split('\n').length,beforeRejectedSpawns);

  fs.writeFileSync(path.join(workspace,'source.mjs'),acceptedSource);
  const successor=await run(packet('successor',{...successorBase,output:path.join(root,'successor-output'),predecessor}));
  assert.equal(successor.state,'review-ready');
  assert.equal(fs.readFileSync(path.join(workspace,'source.mjs'),'utf8'),acceptedSource);
  assert.equal(fs.readFileSync(first.handoff.handoffPath,'utf8'),firstRaw);
  assert.equal(fs.readFileSync(report.handoff.handoffPath,'utf8'),'corrected reviewed report\n');
 }finally{globalThis.fetch=originalFetch;fs.rmSync(root,{recursive:true,force:true})}
});

test('predecessor drift during catalog preflight is rejected under the lock before worker launch', async () => {
 const {createHash}=await import('node:crypto');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-preflight-race-'))),workspace=path.join(root,'work');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 const source=path.join(workspace,'sum.mjs'),contents='export const value=1;\n';
 fs.writeFileSync(source,contents);
 const handoffPath=path.join(root,'prior.md');fs.writeFileSync(handoffPath,'verified report\n');
 const task=path.join(root,'TASK.md');fs.writeFileSync(task,'No source changes.');
 const marker=path.join(root,'worker-started');
 const executable=path.join(root,'worker.mjs');
 fs.writeFileSync(executable,'#!/usr/bin/env node\nimport fs from "node:fs";fs.writeFileSync('+JSON.stringify(marker)+',"started");console.log(JSON.stringify({type:"step_finish",part:{reason:"stop"}}));',{mode:0o700});
 const predecessor={packetId:'one',nextPacketId:'two',verified:true,handoffPath,handoffSha256:hash('verified report\n'),sourceHashes:{'sum.mjs':hash(contents)}};
 const p={...base,workspace,task,executable,packetId:'two',readFiles:['sum.mjs'],writeFiles:[],commands:[],predecessor,output:path.join(root,'blocked')};
 const packet=path.join(root,'packet.json');fs.writeFileSync(packet,JSON.stringify(p));
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{fs.writeFileSync(source,'changed during preflight');return{ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})}};
  await assert.rejects(()=>run(packet),/Stale predecessor source/);
  assert.equal(fs.existsSync(marker),false);assert.equal(fs.existsSync(p.output),false);
  fs.writeFileSync(source,contents);
  globalThis.fetch=async()=>({ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})});
  fs.writeFileSync(packet,JSON.stringify({...p,output:path.join(root,'valid')}));
  assert.equal((await run(packet)).state,'review-ready');
  assert.equal(fs.readFileSync(marker,'utf8'),'started');
 }finally{globalThis.fetch=original;}
});

test('guarded MCP phase policies enable only the reviewed contract and disable later access',()=>{
 const policy={inventory:['contract','unrelated'],enabled:['contract'],tools:['contract_get_contract']};
 const implementation=config(validate({...base,guardedPhase:'implement',guardedMcpPolicy:policy}));
 assert.equal(implementation.mcp.contract.enabled,true);assert.equal(implementation.mcp.unrelated.enabled,false);
 assert.equal(implementation.permission.contract_get_contract,'allow');
 const report=config(validate({...base,guardedPhase:'report',guardedMcpPolicy:{...policy,enabled:[],tools:[]}}));
 assert.equal(report.mcp.contract.enabled,false);assert.equal(report.permission.contract_get_contract,undefined);
 const noMcp=config(validate({...base,guardedPhase:'implement',guardedMcpPolicy:{inventory:[],enabled:[],tools:[]}}));
 assert.deepEqual(noMcp.mcp,{});assert.equal(noMcp.permission.contract_get_contract,undefined);
 for(const change of [{guardedPhase:'bogus'},{guardedPhase:'test',guardedMcpPolicy:policy},{guardedPhase:'implement'},{guardedPhase:'implement',guardedMcpPolicy:{...policy,tools:['bash']}}])
  assert.throws(()=>validate({...base,...change}));
});

test('persisted runner evidence rejects malformed tails and conflicting terminals after stop',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-stream-run-'))),workspace=path.join(root,'work');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 const task=path.join(root,'TASK.md');fs.writeFileSync(task,'Synthetic stream regression.');
 const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})});
 const stop={type:'step_finish',part:{reason:'stop'}};
 const call=(status,exit)=>({type:'tool_use',part:{callID:'test',tool:'bash',state:{status,input:{command:'node --test test.mjs'},metadata:{exit}}}});
 try{
  for(const [name,events,tail,expected] of [
   ['malformed',[stop],Buffer.from('{'),false],
   ['utf8',[stop],Buffer.from([0xf0,0x9f]),false],
   ['failed-test',[call('running'),call('completed',1),stop],Buffer.alloc(0),true],
   ['conflict',[call('completed',0),call('completed',1),stop],Buffer.alloc(0),false]
  ]){
   const executable=path.join(root,name+'.mjs'),bytes=Buffer.concat([Buffer.from(events.map(e=>JSON.stringify(e)).join('\n')+'\n'),tail]);
   fs.writeFileSync(executable,'#!/usr/bin/env node\nprocess.stdout.write(Buffer.from('+JSON.stringify([...bytes])+'));',{mode:0o700});
   const packet=path.join(root,name+'.json');fs.writeFileSync(packet,JSON.stringify({...base,workspace,task,executable,output:path.join(root,name)}));
   const result=await run(packet),saved=JSON.parse(fs.readFileSync(path.join(root,name,'summary.json'),'utf8'));
   assert.deepEqual(saved,result);assert.equal(result.state,expected?'review-ready':'stopped-or-failed');assert.equal(result.modelFinal,expected);
   if(name==='failed-test')assert.equal(result.tools[0].exitCode,1);else assert.ok(result.errors.length);
  }
 }finally{globalThis.fetch=original;}
});

test('runner accepts only a live opaque matching lease and leaves caller ownership intact',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-leased-run-'))),workspace=path.join(root,'work');
 fs.mkdirSync(workspace);execFileSync('git',['init','--quiet',workspace]);
 const task=path.join(root,'TASK.md');fs.writeFileSync(task,'Synthetic leased run.');
 const executable=path.join(root,'worker.mjs');fs.writeFileSync(executable,'#!/usr/bin/env node\nconsole.log(JSON.stringify({type:"step_finish",part:{id:"done",reason:"stop",tokens:{input:1,output:1,reasoning:0,cache:{read:0,write:0}}}}));\n',{mode:0o700});
 const packet=path.join(root,'packet.json');fs.writeFileSync(packet,JSON.stringify({...base,workspace,task,executable,output:path.join(root,'output'),writeFiles:[],commands:[]}));
 const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({models:[{name:'qwen3-coder:30b'}]})});
 const lease=acquireWorkspaceLease(workspace);
 try{
  assert.equal((await run(packet,lease)).state,'review-ready');
  assert.equal(assertWorkspaceLease(lease,workspace),lease);
  await assert.rejects(()=>run(packet,Object.freeze({})),/Invalid or mismatched workspace lease/);
 }finally{releaseWorkspaceLease(lease);globalThis.fetch=original;fs.rmSync(root,{recursive:true,force:true});}
});
