import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parseJobs} from './parser.mjs';
import {planJobs} from './planner.mjs';
import {processText} from './cli.mjs';
const job=(id='a',tenant='T',extra={})=>({id,tenant,priority:2,createdAt:0,attempts:0,...extra});
test('parser: strings, blanks, CRLF, normalization and exact fields',()=>{
 assert.throws(()=>parseJobs(null),TypeError);assert.throws(()=>parseJobs([]),TypeError);
 assert.deepEqual(parseJobs(' \r\n\n'),{jobs:[],errors:[]});
 assert.deepEqual(parseJobs(JSON.stringify({...job(' a ',' T '),extra:9})+'\r\n'),{jobs:[job()],errors:[]});
});
test('parser: line numbers, JSON errors, schema errors and recovery',()=>{
 const text='\n{bad}\nnull\n[]\n'+JSON.stringify(job())+'\n{"id":""}';
 assert.deepEqual(parseJobs(text),{jobs:[job()],errors:[{line:2,code:'INVALID_JSON'},{line:3,code:'INVALID_JOB'},{line:4,code:'INVALID_JOB'},{line:6,code:'INVALID_JOB'}]});
});
test('parser: field types and boundaries',()=>{
 for(const [field,values] of Object.entries({id:['', ' ',4,null],tenant:['',' ',null],priority:[0,6,1.5,'2',null],createdAt:[-1,0.2,9007199254740992,'0',null],attempts:[-1,0.2,9007199254740992,'0',null]})){
 for(const value of values)assert.deepEqual(parseJobs(JSON.stringify(job('a','T',{[field]:value}))).errors,[{line:1,code:'INVALID_JOB'}],field+':'+String(value));
 }
 assert.equal(parseJobs(JSON.stringify(job('x','z',{priority:5,createdAt:Number.MAX_SAFE_INTEGER,attempts:Number.MAX_SAFE_INTEGER}))).jobs.length,1);
});
test('planner: input/options validation before deduplication or filtering',()=>{
 for(const value of [null,{},'x'])assert.throws(()=>planJobs(value),TypeError);
 for(const value of [null,[],5])assert.throws(()=>planJobs([],value),TypeError);
 for(const batchSize of [0,51,1.2,'2',NaN])assert.throws(()=>planJobs([],{batchSize}),TypeError);
 for(const maxAttempts of [0,101,1.2,'3',Infinity])assert.throws(()=>planJobs([],{maxAttempts}),TypeError);
 for(const bad of [null,[],{...job(),id:' a '},{...job(),priority:0},{...job(),createdAt:NaN},{...job(),attempts:Infinity}])assert.throws(()=>planJobs([bad,job()]),TypeError);
 assert.deepEqual(planJobs([]),{batches:[],duplicates:0,filtered:0});
});
test('planner: newest wins, ties last wins, THEN filter, tuple collision safe',()=>{
 const x=[job('c','a|b'),job('b|c','a'),job('x','T'),job('x','T',{createdAt:2}),job('x','T',{createdAt:2,attempts:3})];
 const result=planJobs(x);
 assert.equal(result.duplicates,2);assert.equal(result.filtered,1);
 assert.deepEqual(result.batches.map(b=>[b.tenant,b.jobs[0].id]),[['a','b|c'],['a|b','c']]);
 const y=planJobs([job('x','T',{createdAt:5}),job('x','T',{createdAt:1,attempts:9})]);assert.equal(y.filtered,0);assert.equal(y.batches[0].jobs[0].createdAt,5);
});
test('planner: priorities, timestamps, UTF-16 IDs, per-tenant chunks',()=>{
 const input=['z','a','A','!'].map(id=>job(id,'T',{createdAt:3}));
 input.push(job('low','T',{priority:1}),job('new','T',{priority:5,createdAt:2}),job('old','T',{priority:5,createdAt:1}),job('last','a'),job('first','!'));
 const r=planJobs(input,{batchSize:2,maxAttempts:100});
 assert.deepEqual(r.batches.map(b=>[b.tenant,b.batch,b.jobs.map(j=>j.id)]),[['!',1,['first']],['T',1,['old','new']],['T',2,['!','A']],['T',3,['a','z']],['T',4,['low']],['a',1,['last']]]);
});
test('planner: immutable input and detached output, defaults and endpoints',()=>{
 const x=[Object.freeze(job('b')),Object.freeze(job('a'))];Object.freeze(x);const opts=Object.freeze({batchSize:50,maxAttempts:1});
 const r=planJobs(x,opts);r.batches[0].jobs[0].id='changed';assert.equal(x[1].id,'a');
 assert.equal(planJobs([job('a','T',{attempts:3})]).filtered,1);
 assert.equal(planJobs([job('a','T',{attempts:99})],{maxAttempts:100,batchSize:1}).batches.length,1);
});
test('integration: accepted counts raw valid rows; parsing continues',()=>{
 const text=[job('a'),job('a','T',{createdAt:2,attempts:3})].map(JSON.stringify).join('\n')+'\nBAD\n';
 assert.deepEqual(processText(text),{accepted:2,errors:[{line:3,code:'INVALID_JSON'}],batches:[],duplicates:1,filtered:1});
});
const cli=(args=[],input='')=>spawnSync(process.execPath,['cli.mjs',...args],{input,encoding:'utf8',timeout:3000,cwd:process.cwd()});
test('CLI: stdin pipeline, default flags and explicit options',()=>{
 const input=[job('b'),job('a'),job('c')].map(JSON.stringify).join('\n');
 for(const args of [[],['--batch-size','1','--max-attempts','2'],['--max-attempts','2','--batch-size','1']]){
 const r=cli(args,input);assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');assert.ok(r.stdout.endsWith('\n'));
 assert.equal(r.stdout.trim().split('\n').length,1);const out=JSON.parse(r.stdout);assert.equal(out.accepted,3);assert.equal(out.batches.length,args.length?3:2);
 }
 const r=cli([],'BAD\n');assert.equal(r.status,0);assert.deepEqual(JSON.parse(r.stdout).errors,[{line:1,code:'INVALID_JSON'}]);
});
test('CLI: strict errors and no import side effects',()=>{
 for(const args of [['--oops'],['--batch-size'],['--batch-size','2x'],['--batch-size','+2'],['--batch-size','1.5'],['--batch-size','0'],['--batch-size','51'],['--max-attempts','101'],['--batch-size','2','--batch-size','2'],['--max-attempts','2','--max-attempts','2']]){
 const r=cli(args);assert.equal(r.status,2,JSON.stringify(args));assert.equal(r.stdout,'');assert.equal(r.stderr,'INVALID_ARGUMENTS\n');
 }
 const r=spawnSync(process.execPath,['--input-type=module','-e',"await import('./cli.mjs'); console.log('IMPORTED');"],{encoding:'utf8',timeout:3000});assert.equal(r.status,0);assert.equal(r.stdout,'IMPORTED\n');assert.equal(r.stderr,'');
});
