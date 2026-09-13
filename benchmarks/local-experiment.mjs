// Local-only experiment launcher. Does not launch a cloud model or run tests itself.
// The frontier host authors/reviews the packet policy below. Qwen executes all checks.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {run} from '../scripts/run-local.mjs';
const text=fs.readFileSync(new URL('./pilot.mjs',import.meta.url),'utf8');
const cases=vm.runInNewContext(text.slice(text.indexOf('const cases=['),text.indexOf('const root='))+';cases;');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'open-lm-local-experiment-'));fs.chmodSync(root,0o700);
const save=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{mode:0o600});
const rows=[];console.log(JSON.stringify({event:'local-experiment-start',root,planner:'current frontier host',implementer:'qwen3-coder:30b',cloudCallsFromLauncher:0}));
for(const c of cases){
 const work=path.join(root,c.id);fs.mkdirSync(work);execFileSync('git',['init','--quiet',work]);
 save(path.join(work,'impl.mjs'),c.starter+'\n');
 const visible="import assert from 'node:assert/strict';import * as m from './impl.mjs';"+c.visible+'\n';
 save(path.join(work,'visible.test.mjs'),visible);
 let feedback='',passed=false;const attempts=[];
 const started=Date.now();
 for(let attempt=0;attempt<3;attempt++){
  const resident=await fetch('http://127.0.0.1:11434/api/ps').then(r=>r.json());
  if(resident.models?.some(m=>m.name!=='qwen3-coder:30b'))throw Error('Another local model is resident; stop rather than load concurrently');
  // Remove nothing: verifier files from prior attempts remain protected; feedback has already disclosed failures.
  const task=path.join(root,c.id+'-'+attempt+'-TASK.md');
  save(task,'# Open LM implementation packet\nPlanner: current frontier host. Parent: separate-local-experiment.\nOutcome: implement the complete contract below in Node 22 ESM. No dependencies or external effects.\n'+c.spec+'\nStarting state: impl.mjs is the only implementation; visible.test.mjs is a protected smoke test. Read these two files only, plus prior failure evidence below. Modify only impl.mjs and HANDOFF.md. Do not edit tests, configuration or other files; no network, Codex, other models, commits or deployment.\nUse actual native tools; never print XML/JSON pretending to invoke tools. Plan briefly, implement the smallest clear solution, then run exactly node --test --test-timeout=10000 visible.test.mjs. Do not rerun a green test without relevant changes. Write HANDOFF.md under 150 words with actual checks and unresolved items, then STOP. No self-approval or savings claim.\nFailure evidence, if any:\n'+feedback);
  const packet={workspace:work,task,output:path.join(root,c.id+'-'+attempt+'-implement'),model:'qwen3-coder:30b',context:16384,outputTokens:4096,writeFiles:['impl.mjs','HANDOFF.md'],commands:['node --test --test-timeout=10000 visible.test.mjs'],disabledMcp:['aws-mcp'],reviewedConfig:true,timeoutSeconds:240,maxToolEvents:20};
  const packetPath=path.join(root,c.id+'-'+attempt+'-packet.json');save(packetPath,packet);
  const implementation=await run(packetPath);
  // Reveal verifier assertions only after implementation handoff; verification cannot edit implementation/tests.
  const implBefore=fs.readFileSync(path.join(work,'impl.mjs'),'utf8');
  const verificationSource="import assert from 'node:assert/strict';import * as m from './impl.mjs';"+c.hidden+'\n';
  save(path.join(work,'verify.test.mjs'),verificationSource);
  const verifyTask=path.join(root,c.id+'-'+attempt+'-VERIFY.md');
  save(verifyTask,'Verification-only Open LM packet. Do not implement or edit code/tests. Run exactly node --test --test-timeout=10000 visible.test.mjs verify.test.mjs . Write HANDOFF.md with command, actual pass/fail and failure evidence, then STOP. No other commands, external access, models or claims of cloud savings. Only HANDOFF.md may change.');
  const verifyPacket=path.join(root,c.id+'-'+attempt+'-verify-packet.json');
  save(verifyPacket,{...packet,task:verifyTask,output:path.join(root,c.id+'-'+attempt+'-verify'),writeFiles:['HANDOFF.md'],commands:['node --test --test-timeout=10000 visible.test.mjs verify.test.mjs']});
  const verification=await run(verifyPacket);
  const integrity=fs.readFileSync(path.join(work,'impl.mjs'),'utf8')===implBefore&&fs.readFileSync(path.join(work,'visible.test.mjs'),'utf8')===visible&&fs.readFileSync(path.join(work,'verify.test.mjs'),'utf8')===verificationSource;
  const check=verification.tools.find(t=>t.tool==='bash'&&t.command==='node --test --test-timeout=10000 visible.test.mjs verify.test.mjs');
  passed=integrity&&verification.state==='review-ready'&&check?.exitCode===0;
  attempts.push({implementation,verification,integrity,testExit:check?.exitCode??null});
  if(passed)break;
  const events=fs.readFileSync(path.join(verification.logs,'events.jsonl'),'utf8').split('\n').filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});
  feedback=events.filter(e=>e.type==='tool_use'&&e.part?.tool==='bash').map(e=>String(e.part?.state?.output||e.part?.state?.error||'No output')).join('\n').slice(0,5000);
  if(!integrity)throw Error('Protected artifact changed; stop and inspect '+work);
  save(path.join(root,c.id+'-NEEDS-RCA.json'),{feedback,implementation,verification});
  break; // Frontier root-cause analysis is required before any retry; never auto-repair blindly.
 }
 const row={case:c.id,passed,attempts,seconds:(Date.now()-started)/1000,work,acceptance:'External frontier source review remains separate; tests were executed by Qwen through OpenCode.'};
 rows.push(row);save(path.join(root,'results.json'),rows);
 console.log(JSON.stringify({event:'local-case-complete',case:c.id,passed,attempts:attempts.length,seconds:row.seconds}));
}
save(path.join(root,'experiment.json'),{kind:'local-only-implementation',planner:'current frontier host',localModel:'qwen3-coder:30b',rows,cloudCallsFromLauncher:0,frontierPlanningTokens:null,cloudTokenSavings:null,notes:['Fresh starters match prior cloud baseline fixtures; historical baseline remains separate.','Planner is the current frontier host, not a Terra subprocess.','All test commands executed by Qwen/OpenCode; launcher only stages files and reads evidence.','Current host planning/handoff/review usage not instrumented; no full-workflow savings percentage can be computed.','These are already-seen pilot tasks, not new holdouts; one repetition each.']});
console.log(JSON.stringify({event:'local-experiment-finished',root,passed:rows.filter(r=>r.passed).length,total:rows.length,cloudTokenSavings:null}));
