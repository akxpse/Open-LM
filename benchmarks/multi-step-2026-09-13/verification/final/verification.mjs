// Frontier-authored post-hoc verifier. Local agent executes; no candidate repair.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),env={...process.env};delete env.LM_API_TOKEN;
const run=(args,cwd=root,input='')=>{const r=spawnSync(process.execPath,args,{cwd,input,env,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});return{status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''}};
const counts=s=>Object.fromEntries(['tests','pass','fail'].map(k=>[k,Number(s.match(new RegExp('# '+k+' (\\d+)'))?.[1]??NaN)]));
const results={kind:'post-hoc common verification; not a fresh benchmark attempt or hidden predeclared holdout',node:process.version,regexControl:{digitsAcceptsNewline:/^[0-9]+$/.test('2\n'),dAcceptsNewline:/^\d+$/.test('2\n')},packagedRegression:run(['--test','scripts/run-local.test.mjs','scripts/run-local-lmstudio.test.mjs','benchmarks/validate-fixtures.test.mjs']),candidates:[]};
results.packagedRegression.counts=counts(results.packagedRegression.stdout);
for(const label of fs.readdirSync('candidates').sort()){
 const cwd=path.join(root,'candidates',label);
 const suite=run(['--test','verify.test.mjs'],cwd);
 const strict=run(['cli.mjs','--batch-size','2\n'],cwd);
 const validation=run(['--input-type=module','-e',String.raw`const {planJobs}=await import('./planner.mjs');const j={id:'a',tenant:'T',priority:2,createdAt:0,attempts:0};const rejects=v=>{try{planJobs([v]);return false}catch(e){return e instanceof TypeError}};let defaults;try{defaults=JSON.stringify(planJobs([],undefined))===JSON.stringify({batches:[],duplicates:0,filtered:0})}catch{defaults=false}console.log(JSON.stringify({negativeCreatedAt:rejects({...j,createdAt:-1}),negativeAttempts:rejects({...j,attempts:-1}),extraEnumerableKey:rejects({...j,extra:1}),explicitUndefinedDefaults:defaults}));`],cwd);
 const fault=run(['--input-type=module','-e',String.raw`import path from 'node:path';import {pathToFileURL} from 'node:url';process.argv=['node',path.resolve('cli.mjs')];process.stdout.write=()=>{queueMicrotask(()=>process.stdout.emit('error',new Error('SYNTHETIC_STDOUT_FAULT')));return true};await import(pathToFileURL(process.argv[1]).href);`],cwd);
 let boundaries=null;try{boundaries=JSON.parse(validation.stdout)}catch{}
 results.candidates.push({label,visible:{...suite,counts:counts(suite.stdout)},postHoc:{strictTrailingLF:{...strict,passed:strict.status===2&&strict.stdout===''&&strict.stderr==='INVALID_ARGUMENTS\n'},plannerBoundary:{...validation,checks:boundaries},asynchronousStdoutError:{...fault,passed:fault.status===1&&fault.stdout===''&&fault.stderr==='INTERNAL_ERROR\n'}}});
}
fs.writeFileSync('verification-results.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({regression:results.packagedRegression.counts,regex:results.regexControl,candidates:results.candidates.map(c=>({label:c.label,visible:c.visible.counts,strictLF:c.postHoc.strictTrailingLF.passed,boundaries:c.postHoc.plannerBoundary.checks,stdoutError:c.postHoc.asynchronousStdoutError.passed}))}));
if(results.packagedRegression.status!==0)process.exitCode=1;

