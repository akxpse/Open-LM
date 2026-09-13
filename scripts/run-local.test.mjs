import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validate,config,summarize,run} from './run-local.mjs';

const base={workspace:'/tmp/work',task:'/tmp/control/task.md',output:'/tmp/control/out',writeFiles:['sum.mjs'],commands:['node --test test.mjs'],reviewedConfig:true};
test('remote endpoints, cloud models, traversal and missing attestation rejected',()=>{
  for(const change of [{baseURL:'https://example.com/v1'},{baseURL:'http://localhost:11434/v1?x=1'},{model:'qwen:cloud'},{writeFiles:['../oops']},{writeFiles:['**']},{commands:['npm *']},{reviewedConfig:false},{timeoutSeconds:0}])assert.throws(()=>validate({...base,...change}));
});
test('permissions and model routing are local and narrowly scoped',()=>{
  const c=config(validate({...base,disabledMcp:['example-server']}));assert.equal(c.mcp['example-server'].enabled,false);assert.deepEqual(c.enabled_providers,['ollama']);assert.equal(c.permission.bash['*'],'deny');assert.equal(c.permission.edit['sum.mjs'],'allow');assert.equal(c.permission.external_directory,'deny');assert.equal(c.agent['local-worker'].model,'ollama/qwen3-coder:30b');
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
