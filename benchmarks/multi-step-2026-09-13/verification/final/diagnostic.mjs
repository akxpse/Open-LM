// Post-hoc diagnostic refinement; no candidate changes and no repeat visible suite.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const env={...process.env};delete env.LM_API_TOKEN;
const results=[];
for(const label of fs.readdirSync('candidates').sort()){
 const cwd=path.resolve('candidates',label);
 const probe=String.raw`import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';let injected=false;process.on('exit',()=>fs.writeSync(3,JSON.stringify({injected})));process.argv=['node',path.resolve('cli.mjs')];process.stdout.write=()=>{injected=true;queueMicrotask(()=>process.stdout.emit('error',new Error('SYNTHETIC_STDOUT_FAULT')));return true};await import(pathToFileURL(process.argv[1]).href);`;
 const fault=spawnSync(process.execPath,['--input-type=module','-e',probe],{cwd,env,input:'',encoding:'utf8',timeout:5000,stdio:['pipe','pipe','pipe','pipe']});
 let injected=false;try{injected=JSON.parse(fault.output[3]).injected}catch{}
 const defaults=spawnSync(process.execPath,['--input-type=module','-e',String.raw`const {planJobs}=await import('./planner.mjs');const results=[];for(const o of [{batchSize:undefined},{maxAttempts:undefined},{batchSize:undefined,maxAttempts:undefined}]){try{results.push(JSON.stringify(planJobs([],o))===JSON.stringify({batches:[],duplicates:0,filtered:0}))}catch{results.push(false)}}console.log(JSON.stringify(results));`],{cwd,env,encoding:'utf8',timeout:5000});
 let values=null;try{values=JSON.parse(defaults.stdout)}catch{}
 results.push({label,fault:{injected,status:fault.status,stdout:fault.stdout,stderr:fault.stderr,passed:injected&&fault.status===1&&fault.stdout===''&&fault.stderr==='INTERNAL_ERROR\n'},undefinedOptionFields:{values,status:defaults.status,stderr:defaults.stderr}});
}
fs.writeFileSync('diagnostic-results.json',JSON.stringify({kind:'post-hoc refinement: verifies fault reached; adds explicit undefined option fields equally to all snapshots',results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({label:r.label,faultReached:r.fault.injected,faultPassed:r.fault.passed,undefinedOptions:r.undefinedOptionFields.values}))));

