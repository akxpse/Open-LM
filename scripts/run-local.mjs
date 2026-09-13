#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const inside = (root, item) => item === root || item.startsWith(root + path.sep);
function integer(value, fallback, min, max) {
  const n = value ?? fallback;
  if (!Number.isInteger(n) || n < min || n > max) throw Error('Invalid numeric budget');
  return n;
}
export function validate(p) {
  for (const k of ['workspace', 'task', 'output']) if (!path.isAbsolute(p[k] || '')) throw Error(`${k} must be absolute`);
  if (p.reviewedConfig !== true) throw Error('Review effective OpenCode configuration before running');

  const runtime = p.runtime ?? 'ollama';
  if (runtime !== 'ollama' && runtime !== 'lmstudio') throw Error('Invalid runtime; only ollama or lmstudio are supported');

  let url;
  if (runtime === 'lmstudio') {
    url = new URL(p.baseURL || 'http://127.0.0.1:1234/v1');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password || url.search || url.hash || url.pathname !== '/v1') throw Error('Only loopback LM Studio /v1 endpoints are allowed');
  } else {
    url = new URL(p.baseURL || 'http://127.0.0.1:11434/v1');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password || url.search || url.hash || url.pathname !== '/v1') throw Error('Only loopback Ollama /v1 endpoints are allowed');
  }

  if (p.disabledMcp !== undefined && (!Array.isArray(p.disabledMcp) || p.disabledMcp.some(x=>typeof x !== 'string' || !x))) throw Error('disabledMcp must be a string array');
  const model = p.model || (runtime === 'lmstudio' ? '' : 'qwen3-coder:30b');
  if (runtime === 'lmstudio' && (!model || model.trim() === '')) throw Error('LM Studio requires an explicit non-empty model name');
  if (!/^[a-zA-Z0-9_.:/-]+$/.test(model) || /cloud/i.test(model)) throw Error('Invalid or cloud model ID');
  for (const k of ['writeFiles', 'commands']) if (!Array.isArray(p[k]) || p[k].some(x => typeof x !== 'string' || !x.trim())) throw Error(`${k} must be a string array`);
  for (const f of p.writeFiles) if (path.isAbsolute(f) || f.split(/[\\/]/).includes('..') || /[*?\[\]{}\n\r]/.test(f) || f === '.') throw Error('writeFiles must be exact relative files');
  for (const c of p.commands) if (/[\n\r*?]/.test(c)) throw Error('Commands must be exact single-line permission patterns');

  return {...p, model, baseURL:url.href, runtime, timeoutSeconds:integer(p.timeoutSeconds,600,1,3600), maxToolEvents:integer(p.maxToolEvents,30,1,200), maxLogBytes:integer(p.maxLogBytes,8388608,1024,67108864), context:integer(p.context,32768,2048,131072), outputTokens:integer(p.outputTokens,4096,128,16384)};
}
export function config(p) {
  const edits = {'*':'deny'};
  for (const f of p.writeFiles) edits[f] = 'allow';
  const permission = {'*':'deny',read:'allow',glob:'allow',grep:'allow',edit:edits,external_directory:'deny',bash:{'*':'deny',...Object.fromEntries(p.commands.map(c=>[c,'allow']))}};

  let model = `ollama/${p.model}`;
  let providerName = 'Local loop Ollama';
  if (p.runtime === 'lmstudio') {
    model = `lmstudio/${p.model}`;
    providerName = 'Local LM Studio';
  }

  const providerOptions = {baseURL:p.baseURL};

  // For LM Studio, handle API token
  if (p.runtime === 'lmstudio' && process.env.LM_API_TOKEN) {
    providerOptions.apiKey = '{env:LM_API_TOKEN}';
  }

  return {mcp:Object.fromEntries((p.disabledMcp||[]).map(name=>[name,{enabled:false}])),enabled_providers:[p.runtime],model,small_model:model,share:'disabled',autoupdate:false,permission,
    provider:{[p.runtime]:{npm:'@ai-sdk/openai-compatible',name:providerName,options:providerOptions,models:{[p.model]:{name:p.model,limit:{context:p.context,output:p.outputTokens}}}}},
    agent:{'local-worker':{mode:'primary',model,permission,prompt:'Implement only the packet. Use only approved tools. Stop after handoff. Never bypass a denial.'},compaction:{model},title:{model},summary:{model}}};
}
export function summarize(events) {
  const seen = new Set(), tools = [], errors = [], tokens = {input:0,output:0,reasoning:0,cacheRead:0,cacheWrite:0};
  for (const e of events) {
    const p=e.part||{};
    if(e.type==='tool_use' && !seen.has(p.callID||p.id)) {
      seen.add(p.callID||p.id);
      tools.push({tool:p.tool,command:p.state?.input?.command??null,status:p.state?.status??'unknown',exitCode:p.state?.metadata?.exit??null,error:p.state?.error??null});
    }
    if(e.type==='error') errors.push(e.error??e);
    if(e.type==='step_finish') {const t=p.tokens||{};tokens.input+=t.input||0;tokens.output+=t.output||0;tokens.reasoning+=t.reasoning||0;tokens.cacheRead+=t.cache?.read||0;tokens.cacheWrite+=t.cache?.write||0;}
  }
  return {toolEvents:tools.length,tools,errors,tokens};
}
export async function run(packetPath) {
  if(process.platform==='win32') throw Error('v0 runner supports macOS/Linux process groups only');
  const p=validate(JSON.parse(fs.readFileSync(packetPath,'utf8')));
  p.workspace=fs.realpathSync(p.workspace);
  const gitRoot=fs.realpathSync(execFileSync('git',['rev-parse','--show-toplevel'],{cwd:p.workspace,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim());
  if(gitRoot!==p.workspace)throw Error('workspace must be its Git root; initialize a fresh staging repo first');
  const task=fs.realpathSync(p.task);
  const parent=fs.realpathSync(path.dirname(p.output));
  const output=path.join(parent,path.basename(p.output));
  if(inside(p.workspace,output)||inside(p.workspace,task)) throw Error('Control files/output must be outside workspace');
  for(const f of p.writeFiles) {
    let current=p.workspace;
    for(const part of f.split('/')) {current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Writable symlinks are not allowed');}
  }
  let modelsEndpoint;
  if (p.runtime === 'lmstudio') {
    modelsEndpoint = new URL('/v1/models', p.baseURL);
  } else {
    modelsEndpoint = new URL('/api/tags', p.baseURL);
  }

  const fetchOptions = {
    signal: AbortSignal.timeout(5000)
  };

  if (p.runtime === 'lmstudio' && process.env.LM_API_TOKEN) {
    fetchOptions.headers = {
      'Authorization': `Bearer ${process.env.LM_API_TOKEN}`
    };
  }

  const response=await fetch(modelsEndpoint, fetchOptions);
  if(!response.ok)throw Error('Runtime model preflight failed');
  const catalog=await response.json();

  let foundModel = false;
  if (p.runtime === 'lmstudio') {
    // For LM Studio, check data[].id for models
    if (catalog.data && Array.isArray(catalog.data)) {
      foundModel = catalog.data.some(m => m.id === p.model);
    }
  } else {
    // For Ollama, check models[].name or models[].model
    if (catalog.models && Array.isArray(catalog.models)) {
      foundModel = catalog.models.some(m => m.name === p.model || m.model === p.model);
    }
  }

  if (!foundModel) throw Error('Model is not installed; no automatic download');
  const lock=path.join(os.tmpdir(),'local-model-loop-'+crypto.createHash('sha256').update(p.workspace).digest('hex')+'.lock');
  const fd=fs.openSync(lock,'wx',0o600);fs.closeSync(fd);
  let child, timer, killTimer;
  const started=Date.now(), events=[];let stopReason=null,bytes=0,buffer='',modelFinal=false,toolIds=new Set();
  let eventFd,stderrFd;
  const stop=reason=>{if(stopReason)return;stopReason=reason;if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{}killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},2000);}};
  const interrupt=()=>stop('interrupted');
  try {
    fs.mkdirSync(output,{mode:0o700});
    eventFd=fs.openSync(path.join(output,'events.jsonl'),'wx',0o600);stderrFd=fs.openSync(path.join(output,'stderr.log'),'wx',0o600);
    const env={...process.env,OPENCODE_CONFIG_CONTENT:JSON.stringify(config(p)),OPENCODE_PERMISSION:JSON.stringify(config(p).permission),OPENCODE_AUTO_SHARE:'false',OPENCODE_DISABLE_AUTOUPDATE:'true',OPENCODE_DISABLE_DEFAULT_PLUGINS:'true',OPENCODE_DISABLE_LSP_DOWNLOAD:'true',OPENCODE_DISABLE_MODELS_FETCH:'true',OPENCODE_DISABLE_CLAUDE_CODE:'true'};
    const prompt=`Workspace: ${p.workspace}\nUse this exact working directory and absolute paths for file tools.\n`+fs.readFileSync(task,'utf8');
    child=spawn(p.executable||'opencode',['run','--dir',p.workspace,'--pure','--agent','local-worker','-m',`${p.runtime}/${p.model}`,'--format','json',prompt],{cwd:p.workspace,env,detached:true,stdio:['ignore','pipe','pipe']});
    const line=s=>{try{const e=JSON.parse(s);events.push(e);if(e.type==='step_finish'&&e.part?.reason==='stop')modelFinal=true;if(e.type==='tool_use'){toolIds.add(e.part?.callID||e.part?.id);if(toolIds.size>=p.maxToolEvents)stop('tool-event-limit');}}catch{}};
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>p.maxLogBytes){stop('log-byte-limit');return;}fs.writeSync(eventFd,chunk);buffer+=chunk.toString();let n;while((n=buffer.indexOf('\n'))>=0){line(buffer.slice(0,n));buffer=buffer.slice(n+1);}});
    child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>p.maxLogBytes){stop('log-byte-limit');return;}fs.writeSync(stderrFd,chunk);});
    timer=setTimeout(()=>stop('wall-time-limit'),p.timeoutSeconds*1000);
    process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
    const result=await new Promise(resolve=>{child.once('error',e=>resolve({exitCode:null,error:e.message}));child.once('close',(exitCode,signal)=>resolve({exitCode,signal}));});
    if(buffer.trim())line(buffer);
    const evidence=summarize(events);
    const ready=!stopReason&&!result.error&&result.exitCode===0&&evidence.errors.length===0&&modelFinal;
    const summary={skillVersion:'0.0.0',state:ready?'review-ready':'stopped-or-failed',accepted:false,model:p.model,workspace:p.workspace,elapsedSeconds:(Date.now()-started)/1000,stopReason,...result,...evidence,logs:output,verification:'Independent review and tests still required; tool evidence is not an OS sandbox or correctness proof.',runtime:p.runtime};
    fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
    return summary;
  } finally {
    clearTimeout(timer);clearTimeout(killTimer);process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);
    if(stopReason&&child?.pid){try{process.kill(-child.pid,'SIGKILL');}catch{}}
    if(eventFd!==undefined)fs.closeSync(eventFd);if(stderrFd!==undefined)fs.closeSync(stderrFd);fs.unlinkSync(lock);
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(!process.argv[2]){console.error('Usage: node run-local.mjs /absolute/packet.json');process.exitCode=2;}
  else try{const summary=await run(path.resolve(process.argv[2]));console.log(JSON.stringify(summary,null,2));process.exitCode=summary.state==='review-ready'?0:1;}catch(e){console.error(e.message);process.exitCode=1;}
}
