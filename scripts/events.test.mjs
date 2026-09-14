import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,EventStream} from './events.mjs';

const tool=(status,exit,change={})=>({type:'tool_use',part:{callID:'call',tool:'bash',state:{status,input:{command:'node test.mjs',workdir:'/tmp/work'},metadata:{exit},...change}}});
const finish=(reason='stop')=>({type:'step_finish',part:{reason}});
test('tool lifecycle retains terminal failures, identity, scope and event order',()=>{
 const s=summarize([tool('pending'),tool('running'),tool('completed',1),finish()]);
 assert.equal(s.tools[0].status,'completed');assert.equal(s.tools[0].exitCode,1);
 assert.equal(s.tools[0].id,'call');assert.equal(s.tools[0].cwd,'/tmp/work');
 assert.equal(s.tools[0].firstEvent,0);assert.equal(s.tools[0].lastEvent,2);
 assert.deepEqual(s.errors,[]);assert.equal(s.modelFinal,true);
});
test('duplicate success is harmless but conflicting terminals never become a pass',()=>{
 const success=tool('completed',0);
 assert.equal(summarize([success,success,finish()]).toolEvents,1);
 for(const last of [tool('completed',1),tool('error'),tool('running'),tool('completed',0,{input:{command:'different'}})]) {
  const s=summarize([success,last,finish()]);assert.ok(s.errors.length);assert.equal(s.modelFinal,false);
 }
});
test('missing identities, invalid statuses/exits and unresolved calls fail closed',()=>{
 for(const event of [
  {type:'tool_use',part:{tool:'read',state:{status:'completed'}}},
  tool('unknown'),tool('running'),tool('pending'),tool('completed','0'),tool('error')
 ]) {const s=summarize([event,finish()]);assert.ok(s.errors.length);assert.equal(s.modelFinal,false);}
});
test('late activity or truncation invalidates earlier normal termination',()=>{
 for(const tail of [finish('length'),{type:'step_start'},{type:'text'},{type:'reasoning'},tool('completed',0),{type:'error'}]) {
  assert.equal(summarize([finish(),tail]).modelFinal,false);
 }
 assert.equal(summarize([finish(),{type:'step_start'},finish()]).modelFinal,true);
});
test('terminal identity enrichment retains unknown exits without inventing zero',()=>{
 const s=summarize([tool('running'),tool('completed'),finish()]);
 assert.equal(s.tools[0].exitCode,null);assert.deepEqual(s.errors,[]);
});
test('completion counter duplicates are not billed twice and conflicts are rejected',()=>{
 const e={type:'step_finish',part:{id:'step',reason:'stop',tokens:{input:5,output:3,reasoning:1,cache:{read:2,write:0}}}};
 assert.equal(summarize([e,e]).tokens.input,5);assert.equal(summarize([e,e]).tokenUsageComplete,true);
 assert.equal(summarize([finish()]).tokenUsageComplete,false);
 assert.ok(summarize([e,{...e,part:{...e.part,reason:'length'}}]).errors.length);
 assert.equal(summarize([e,{type:'step_start'},e]).modelFinal,false);
});
test('stream decoder preserves multibyte characters across every byte boundary',()=>{
 const event={type:'text',part:{text:'𐀀 café 🐦'}},bytes=Buffer.from(JSON.stringify(event)+'\n');
 for(let split=1;split<bytes.length;split++) {
  const events=[],stream=new EventStream(e=>events.push(e));
  stream.write(bytes.subarray(0,split));stream.write(bytes.subarray(split));stream.end();
  assert.deepEqual(events,[event]);assert.deepEqual(stream.errors,[]);
 }
});
test('malformed JSON, invalid event shapes and truncated UTF-8 leave explicit evidence errors',()=>{
 for(const bytes of [Buffer.from('{'),Buffer.from('null\n'),Buffer.from('{}\n'),Buffer.from('not-json\n'),Buffer.from([0x7b,0x22,0xf0,0x9f])]) {
  const stream=new EventStream(()=>{});stream.write(bytes);stream.end();assert.equal(stream.errors.length,1);
 }
});
