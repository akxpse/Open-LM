// Compact evidence is derived from native events, never from model narration.
const terminal = new Set(['completed', 'error']);
const statuses = new Set(['pending', 'running', ...terminal]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = value => typeof value === 'string' ? value.slice(0, 512) : null;
const canonical = value => JSON.stringify(value, Object.keys(value).sort());

export function summarize(events) {
  const calls = new Map(), finishes = new Map(), errors = [];
  const tokens = {input:0, output:0, reasoning:0, cacheRead:0, cacheWrite:0};
  let modelFinal = false, tokenUsageComplete = true, finishCount = 0;
  const problem = message => errors.push(message);
  for (const [index, event] of events.entries()) {
    if (!object(event) || typeof event.type !== 'string') { problem('Malformed native event'); modelFinal=false; continue; }
    const part = object(event.part) ? event.part : {};
    if (event.type === 'error') { problem(bounded(event.error?.message) ?? 'Native client error'); modelFinal=false; }
    if (['step_start','text','reasoning','tool_use'].includes(event.type)) modelFinal=false;
    if (event.type === 'tool_use') {
      const id = part.callID ?? part.id;
      if (typeof id !== 'string' || !id || typeof part.tool !== 'string' || !part.tool) { problem('Tool identity is missing or invalid'); continue; }
      const state = object(part.state) ? part.state : {}, input = object(state.input) ? state.input : {};
      const next = {
        id, tool:part.tool, command:typeof input.command==='string'?input.command:null,
        cwd:typeof input.workdir==='string'?input.workdir:typeof input.cwd==='string'?input.cwd:null,
        paths:[...new Set(['filePath','path','file_path'].map(key=>input[key]).filter(value=>typeof value==='string'))].sort(),
        status:state.status ?? 'unknown', exitCode:state.metadata?.exit ?? null,
        error:bounded(state.error), firstEvent:index, lastEvent:index
      };
      if (!statuses.has(next.status)) problem(`Invalid tool status for ${id}`);
      if (next.exitCode!==null && !Number.isInteger(next.exitCode)) { problem(`Invalid tool exit for ${id}`); next.exitCode=null; }
      const prior = calls.get(id);
      if (prior) {
        next.firstEvent=prior.firstEvent;
        for (const key of ['tool','command','cwd','exitCode','error']) {
          if (prior[key]!==null && next[key]!==null && prior[key]!==next[key]) problem(`Conflicting ${key} for ${id}`);
          if (next[key]===null) next[key]=prior[key];
        }
        if (prior.paths.length && next.paths.length && JSON.stringify(prior.paths)!==JSON.stringify(next.paths)) problem(`Conflicting paths for ${id}`);
        if (!next.paths.length) next.paths=prior.paths;
        if (terminal.has(prior.status) && next.status!==prior.status) problem(`Conflicting terminal status for ${id}`);
        if (prior.status==='running' && next.status==='pending') problem(`Reversed tool lifecycle for ${id}`);
      }
      calls.set(id,next);
    }
    if (event.type === 'step_finish') {
      const reason=part.reason;
      const t=part.tokens, values={input:t?.input,output:t?.output,reasoning:t?.reasoning,cacheRead:t?.cache?.read,cacheWrite:t?.cache?.write};
      const record={reason,tokens:canonical(values)}, id=part.id;
      if (typeof id==='string' && finishes.has(id)) {
        if (canonical(finishes.get(id))!==canonical(record)) {problem('Conflicting completion event');modelFinal=false;}
        continue;
      }
      if (typeof id==='string') finishes.set(id,record);
      finishCount++;
      modelFinal=reason==='stop';
      for (const [key,value] of Object.entries(values)) {
        if (!Number.isSafeInteger(value) || value<0) {
          tokenUsageComplete=false;
          if (value!==undefined) problem('Invalid native token counter');
        } else tokens[key]+=value;
      }
    }
  }
  const tools=[...calls.values()];
  for (const tool of tools) {
    if (!terminal.has(tool.status)) problem(`Unresolved tool call ${tool.id}`);
    if (tool.status==='error') problem(`Tool failed: ${tool.id}`);
  }
  return {toolEvents:tools.length,tools,errors,tokens,tokenUsageComplete:tokenUsageComplete&&finishCount>0,modelFinal:modelFinal&&errors.length===0};
}

// A fatal streaming decoder preserves split Unicode and rejects malformed/truncated UTF-8.
export class EventStream {
  constructor(onEvent) { this.decoder=new TextDecoder('utf-8',{fatal:true}); this.buffer=''; this.onEvent=onEvent; this.errors=[]; this.failed=false; }
  fail() { if (!this.failed) this.errors.push('Malformed or truncated native event stream'); this.failed=true; }
  line(value) {
    if (!value.trim() || this.failed) return;
    try { const event=JSON.parse(value); if (!object(event)||typeof event.type!=='string') throw Error(); this.onEvent(event); }
    catch { this.fail(); }
  }
  write(chunk) {
    if (this.failed) return;
    try { this.buffer+=this.decoder.decode(chunk,{stream:true}); }
    catch { this.fail(); return; }
    let end;
    while ((end=this.buffer.indexOf('\n'))>=0) { this.line(this.buffer.slice(0,end)); this.buffer=this.buffer.slice(end+1); }
  }
  end() {
    if (this.failed) return;
    try { this.buffer+=this.decoder.decode(); this.line(this.buffer); this.buffer=''; }
    catch { this.fail(); }
  }
}
