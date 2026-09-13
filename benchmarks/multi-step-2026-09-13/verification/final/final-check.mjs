import fs from 'node:fs';import {spawnSync} from 'node:child_process';
for(const file of ['verification.mjs','diagnostic.mjs']){const r=spawnSync(process.execPath,[file],{encoding:'utf8',timeout:60000});if(r.status!==0){process.stderr.write(r.stderr);throw Error(file+' failed')}}
const v=JSON.parse(fs.readFileSync('verification-results.json')),d=JSON.parse(fs.readFileSync('diagnostic-results.json'));
const candidates=v.candidates.map(c=>{const diag=d.results.find(x=>x.label===c.label);return{label:c.label,visible:c.visible.counts,strictLF:c.postHoc.strictTrailingLF.passed,boundaries:c.postHoc.plannerBoundary.checks,faultReached:diag.fault.injected,faultPassed:diag.fault.passed,undefinedOptions:diag.undefinedOptionFields.values}});
const passed=v.packagedRegression.status===0&&candidates.every(c=>c.visible.fail===0&&c.visible.pass===10&&c.strictLF&&Object.values(c.boundaries??{}).every(Boolean)&&c.faultReached&&c.faultPassed&&c.undefinedOptions?.every(Boolean));
const result={kind:'Final changed-candidate verification; same earlier post-hoc criteria; no implementation',packagedRegression:v.packagedRegression.counts,candidates,passed};fs.writeFileSync('final-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!passed)process.exitCode=1;

