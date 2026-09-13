import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Validate the exact frozen pilot assertions without importing its executing runner.
const source=fs.readFileSync(new URL('./pilot.mjs',import.meta.url),'utf8');
const block=source.slice(source.indexOf('const cases=['),source.indexOf('const root='));
const cases=vm.runInNewContext(block+';cases;');
const gold={
 normalize:{normalize(items){if(!Array.isArray(items))throw new TypeError();return [...new Set(items.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))].sort();}},
 'ttl-cache':{createCache({now,ttlMs}){if(typeof now!=='function'||typeof ttlMs!=='number'||!Number.isFinite(ttlMs)||ttlMs<0)throw new TypeError();const data=new Map();const prune=()=>{const t=now();for(const[k,v]of data)if(t>=v.expires)data.delete(k);};return{get(k){prune();return data.get(k)?.value;},set(k,value){data.set(k,{value,expires:now()+ttlMs});},delete(k){prune();return data.delete(k);},size(){prune();return data.size;}};}},
 'concurrency-map':{async mapLimit(items,limit,worker){if(!Array.isArray(items)||!Number.isInteger(limit)||limit<1||typeof worker!=='function')throw new TypeError();const out=new Array(items.length);let next=0,failed=false,reason;async function lane(){while(!failed&&next<items.length){const i=next++;try{out[i]=await worker(items[i],i);}catch(e){if(!failed){failed=true;reason=e;}}}}await Promise.all(Array.from({length:Math.min(limit,items.length)},lane));if(failed)throw reason;return out;}}
};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
for(const c of cases){
 test(c.id+': visible and hidden checks accept reference',async()=>{
  await new AsyncFunction('assert','m',c.visible)(assert,gold[c.id]);
  await new AsyncFunction('assert','m',c.hidden)(assert,gold[c.id]);
 });
 test(c.id+': hidden checks reject seeded starter defect',async()=>{
  const m={};const declaration=c.starter.replace('export ','');
  const name=c.id==='normalize'?'normalize':c.id==='ttl-cache'?'createCache':'mapLimit';
  new Function('m',declaration+';m.'+name+'='+name)(m);
  await assert.rejects(()=>new AsyncFunction('assert','m',c.hidden)(assert,m));
 });
}
