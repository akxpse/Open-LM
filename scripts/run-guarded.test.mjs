import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {runGuarded, validateGuardedPacket} from './run-guarded.mjs';
import {run as runLocal} from './run-local.mjs';
import {acquireWorkspaceLease,releaseWorkspaceLease,workspaceLockPath} from './workspace-lock.mjs';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const event = (tool, id, input, metadata = {}) => ({type: 'tool_use', part: {tool, callID: id, state: {status: 'completed', input, metadata}}});
const finish = id => ({type: 'step_finish', part: {id, reason: 'stop', tokens: {input: 1, output: 1, reasoning: 0, cache: {read: 0, write: 0}}}});

function setup(testExit = 0) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'open lm guarded ')));
  const workspace = path.join(root, 'work'); fs.mkdirSync(workspace); execFileSync('git', ['init', '--quiet', workspace]);
  fs.writeFileSync(path.join(workspace, 'source.mjs'), 'export const value = 0;\n');
  fs.writeFileSync(path.join(workspace, 'verify.test.mjs'), `import './source.mjs';process.exit(${testExit});\n`);
  const task = path.join(root, 'TASK.md'); fs.writeFileSync(task, 'Set value to one.');
  const executable = path.join(root, 'opencode-adapter'); fs.writeFileSync(executable, '#!/bin/sh\nexit 99\n', {mode: 0o700});
  const packet = {workspace, task, output: path.join(root, 'output'), packetId: 'packet-1', reviewedConfig: true,
    reviewedMcpInventory: true, executable, runtime: 'ollama', model: 'qwen3-coder:30b',
    readFiles: ['source.mjs', 'verify.test.mjs'], writeFiles: ['source.mjs'],
    verificationFiles: ['source.mjs', 'verify.test.mjs'], mcpInventory: ['benchdata', 'foreign'],
    contractMcp: 'benchdata', contractTool: 'benchdata_get_contract',
    test: {executable: process.execPath, argv: ['verify.test.mjs', 'verify.test.mjs'], cwd: '.', timeoutMs: 2_000, maxOutputBytes: 16_384},
    budgets: {total: {timeoutSeconds: 60, maxToolEvents: 12, maxLogBytes: 3_000_000},
      implement: {timeoutSeconds: 20, maxToolEvents: 4, maxLogBytes: 1_000_000},
      test: {timeoutSeconds: 20, maxToolEvents: 4, maxLogBytes: 1_000_000},
      report: {timeoutSeconds: 20, maxToolEvents: 4, maxLogBytes: 1_000_000}}};
  const packetPath = path.join(root, 'packet.json'); fs.writeFileSync(packetPath, JSON.stringify(packet));
  return {root, workspace, packet, packetPath};
}

function fakeRunner(fixture, mode = {}) {
  const observed = [], source = path.join(fixture.workspace, 'source.mjs');
  const runPhase = async (packetPath, metadata, ownership) => {
    const p = JSON.parse(fs.readFileSync(packetPath)); observed.push({p, metadata, ownership});
    fs.mkdirSync(p.output, {mode: 0o700});
    let events = [], handoff = null;
    if (metadata.phase === 'implement') {
      fs.writeFileSync(source, 'export const value = 1;\n');
      if (mode.driftDuringImplement) fs.writeFileSync(path.join(fixture.workspace, 'verify.test.mjs'), 'changed fixture\n');
      const contract = p.guardedMcpPolicy.tools[0];
      events = [...(contract ? [event(contract, 'contract', {})] : []), event('read', 'read', {filePath: source}),
        event('write', 'source-write', {filePath: source, content: 'export const value = 1;\n'}), finish('implement-stop')];
    } else if (metadata.phase === 'test') {
      const command = p.commands[0];
      const executed = spawnSync('/bin/sh', ['-c', command], {cwd: p.workspace, encoding: 'utf8'});
      assert.ifError(executed.error);
      if (mode.shimTamper === 'bytes') fs.appendFileSync(path.join(p.workspace, '.open-lm-test'), '// changed\n');
      if (mode.shimTamper === 'mode') fs.chmodSync(path.join(p.workspace, '.open-lm-test'), 0o600);
      events = [event('read', 'test-read', {filePath: path.join(p.workspace, 'verify.test.mjs')}),
        event('bash', 'test', {command, ...(mode.omitTestWorkdir ? {} : {workdir: p.workspace})}, {exit: executed.status}), finish('test-stop')];
      if (mode.driftDuringTest) fs.writeFileSync(path.join(fixture.workspace, 'verify.test.mjs'), 'drift\n');
    } else {
      const taskText = fs.readFileSync(p.task, 'utf8'), nonce = taskText.match(/Guarded-Provenance: ([0-9a-f]{32})/)?.[1];
      const intended = Number.isInteger(mode.reportWords) ? `${'word '.repeat(mode.reportWords-2)}Guarded-Provenance: ${nonce}\n` :
        mode.report === 'markdown-provenance' ? `Report\n**Guarded-Provenance:** ${nonce}\n` : `Report\nGuarded-Provenance: ${nonce}\n`;
      if (mode.report === 'denied') events = [{type: 'tool_use', part: {tool: 'write', callID: 'handoff', state: {status: 'error', input: {filePath: path.join(p.workspace, 'HANDOFF.md'), content: intended}, error: 'denied'}}}, finish('report-stop')];
      else if (mode.report === 'missing') events = [finish('report-stop')];
      else {
        const actual = mode.report === 'stale' ? 'stale bytes\n' : intended;
        fs.writeFileSync(path.join(p.workspace, 'HANDOFF.md'), actual);
        events = [event('write', 'handoff', {filePath: path.join(p.workspace, 'HANDOFF.md'), content: intended}), finish('report-stop')];
        const raw = Buffer.from(actual), snap = path.join(p.output, 'HANDOFF.md'); fs.writeFileSync(snap, raw);
        handoff = {packetId: p.packetId, verified: false, handoffPath: snap, handoffSha256: hash(raw), sourceHashes: {}};
      }
    }
    if (mode.duplicateTerminal && events[0]?.type === 'tool_use') events.splice(1, 0, structuredClone(events[0]));
    fs.writeFileSync(path.join(p.output, 'events.jsonl'), events.map(value => JSON.stringify(value)).join('\n') + '\n');
    return {state: 'review-ready', accepted: false, exitCode: 0, stopReason: null, errors: [], modelFinal: true,
      tokenUsageComplete: true, tokens: {input: 1, output: 1, reasoning: 0, cacheRead: 0, cacheWrite: 0}, handoff, logs: p.output};
  };
  return {runPhase, observed};
}

test('guarded runner enforces three static policies and produces fresh review evidence', async () => {
  const fixture = setup(), fake = fakeRunner(fixture, {omitTestWorkdir: true, duplicateTerminal: true});
  try {
    assert.equal(validateGuardedPacket(fixture.packet).test.argv.length, 2);
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase, randomBytes: () => Buffer.alloc(16, 7)});
    assert.equal(result.state, 'guarded-review-ready'); assert.equal(result.accepted, false); assert.equal(result.successorUnlocked, false);
    assert.deepEqual(fake.observed.map(item => item.metadata.phase), ['implement', 'test', 'report']);
    const testBrief = fs.readFileSync(fake.observed[1].p.task, 'utf8');
    assert.match(testBrief, /Command: \.\/\.open-lm-test/); assert.doesNotMatch(testBrief, /test-once\.(?:mjs|json)/);
    const reportBrief = fs.readFileSync(fake.observed[2].p.task, 'utf8');
    assert.match(reportBrief, /at most 180 words/); assert.match(reportBrief, /do not copy digest values/);
    assert.match(reportBrief, /standalone plaintext line copied byte-for-byte/);
    assert.match(reportBrief, /no Markdown emphasis, backticks, prefix, or suffix/);
    assert.match(reportBrief, /Guarded-Provenance: [0-9a-f]{32}/);
    assert.ok(fake.observed[0].ownership); assert.equal(fake.observed[1].ownership, null); assert.equal(fake.observed[2].ownership, fake.observed[0].ownership);
    const [implementation, verification, report] = fake.observed.map(item => item.p);
    assert.deepEqual(implementation.commands, []); assert.deepEqual(implementation.writeFiles, ['source.mjs']);
    assert.deepEqual(implementation.guardedMcpPolicy, {inventory: ['benchdata', 'foreign'], enabled: ['benchdata'], tools: ['benchdata_get_contract']});
    assert.deepEqual(verification.writeFiles, []); assert.deepEqual(verification.disabledMcp, ['benchdata', 'foreign']);
    assert.deepEqual(verification.guardedMcpPolicy.enabled, []); assert.deepEqual(verification.commands, ['./.open-lm-test']);
    assert.equal(verification.readFiles.includes('.open-lm-test'), false); assert.deepEqual(verification.writeFiles, []);
    const shim = path.join(verification.workspace, '.open-lm-test'), shimSource = fs.readFileSync(shim, 'utf8');
    assert.equal(fs.statSync(shim).mode & 0o777, 0o700); assert.match(shimSource, new RegExp(`^#!${fs.realpathSync(process.execPath)}`));
    assert.match(shimSource, /test-once\.mjs/); assert.match(shimSource, /test-once\.json/);
    assert.match(verification.workspace, /open lm guarded /);
    assert.deepEqual(report.readFiles, []); assert.deepEqual(report.commands, []); assert.deepEqual(report.writeFiles, ['HANDOFF.md']);
    assert.equal('predecessor' in report, false); assert.deepEqual(report.guardedMcpPolicy.tools, []);
    assert.equal(fs.readFileSync(path.join(fixture.workspace, 'source.mjs'), 'utf8'), 'export const value = 1;\n');
    assert.match(fs.readFileSync(path.join(fixture.workspace, 'HANDOFF.md'), 'utf8'), /Guarded-Provenance/);
    assert.deepEqual(Object.keys(result.sourceHashes), ['source.mjs']);
    assert.deepEqual(Object.keys(result.verificationHashes), ['source.mjs', 'verify.test.mjs']);
    assert.equal(result.tokens.input, 3);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('guarded mode also works with an explicitly reviewed empty MCP inventory', async () => {
  const fixture = setup(), fake = fakeRunner(fixture);
  delete fixture.packet.contractMcp; delete fixture.packet.contractTool; fixture.packet.mcpInventory = [];
  fs.writeFileSync(fixture.packetPath, JSON.stringify(fixture.packet));
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'guarded-review-ready');
    assert.deepEqual(fake.observed[0].p.guardedMcpPolicy, {inventory: [], enabled: [], tools: []});
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('whole-attempt lease blocks ordinary runLocal on the candidate during guarded TEST', async () => {
  const fixture = setup(), fake = fakeRunner(fixture), base = fake.runPhase;
  const marker = path.join(fixture.root, 'unexpected-spawn'), blocker = path.join(fixture.root, 'blocker.mjs');
  fs.writeFileSync(blocker, `#!/usr/bin/env node\nimport fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'spawned');\n`, {mode: 0o700});
  const blockedPacket = path.join(fixture.root, 'blocked.json');
  fs.writeFileSync(blockedPacket, JSON.stringify({workspace: fixture.workspace, task: fixture.packet.task,
    output: path.join(fixture.root, 'blocked-output'), executable: blocker, reviewedConfig: true,
    runtime: 'ollama', model: 'qwen3-coder:30b', writeFiles: [], commands: []}));
  let checked = false, fetches = 0;
  fake.runPhase = async (...args) => {
    if (args[1].phase === 'test') {
      await assert.rejects(() => runLocal(blockedPacket), error => error?.code === 'EEXIST');
      checked = true;
    }
    return base(...args);
  };
  const originalFetch = globalThis.fetch; globalThis.fetch = async () => { fetches++; throw Error('catalog must not be reached'); };
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'guarded-review-ready'); assert.equal(checked, true);
    assert.equal(fetches, 0); assert.equal(fs.existsSync(marker), false); assert.equal(fs.existsSync(path.join(fixture.root, 'blocked-output')), false);
  } finally { globalThis.fetch = originalFetch; fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('a concurrent guarded attempt on the same candidate is rejected', async () => {
  const fixture = setup(), fake = fakeRunner(fixture), base = fake.runPhase;
  let enteredResolve, releaseResolve;
  const entered = new Promise(resolve => { enteredResolve = resolve; }), gate = new Promise(resolve => { releaseResolve = resolve; });
  fake.runPhase = async (...args) => {
    if (args[1].phase === 'test') { enteredResolve(); await gate; }
    return base(...args);
  };
  const second = {...fixture.packet, output: path.join(fixture.root, 'second-output')};
  const secondPath = path.join(fixture.root, 'second.json'); fs.writeFileSync(secondPath, JSON.stringify(second));
  try {
    const first = runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    await entered;
    await assert.rejects(() => runGuarded(secondPath, {runPhase: fake.runPhase}), error => error?.code === 'EEXIST');
    assert.equal(fs.existsSync(second.output), false);
    releaseResolve(); assert.equal((await first).state, 'guarded-review-ready');
  } finally { releaseResolve?.(); fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('failed guarded execution releases its whole-attempt lease', async () => {
  const fixture = setup();
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: async () => { throw Error('synthetic failure'); }});
    assert.equal(result.state, 'stopped-or-failed');
    const lease = acquireWorkspaceLease(fixture.workspace);
    assert.equal(releaseWorkspaceLease(lease), true);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('successor source hashes retain predecessor sources but exclude packet-specific tests', async () => {
  const fixture = setup(), dependency = 'dependency.mjs', contents = 'export const dependency = true;\n';
  fs.writeFileSync(path.join(fixture.workspace, dependency), contents);
  fixture.packet.readFiles.push(dependency);
  fixture.packet.predecessor = {packetId: 'prior', nextPacketId: fixture.packet.packetId, verified: true,
    handoffPath: path.join(fixture.root, 'prior.md'), handoffSha256: 'a'.repeat(64), sourceHashes: {[dependency]: hash(contents)}};
  fs.writeFileSync(fixture.packetPath, JSON.stringify(fixture.packet));
  const fake = fakeRunner(fixture);
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.deepEqual(Object.keys(result.sourceHashes), ['dependency.mjs', 'source.mjs']);
    assert.deepEqual(Object.keys(result.verificationHashes), ['dependency.mjs', 'source.mjs', 'verify.test.mjs']);
    assert.equal(result.sourceHashes['verify.test.mjs'], undefined);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('known failed test may report but never becomes review-ready or rewrites source', async () => {
  const fixture = setup(1), fake = fakeRunner(fixture);
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'test-failed'); assert.equal(fake.observed.length, 3);
    assert.equal(fs.readFileSync(path.join(fixture.workspace, 'source.mjs'), 'utf8'), 'export const value = 1;\n');
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('protected source or test drift stops before report', async () => {
  const fixture = setup(), fake = fakeRunner(fixture, {driftDuringTest: true});
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'stopped-or-failed'); assert.match(result.stopReason, /drifted/); assert.equal(fake.observed.length, 2);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('non-writable verification drift during implementation cannot become the test baseline', async () => {
  const fixture = setup(), fake = fakeRunner(fixture, {driftDuringImplement: true});
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'stopped-or-failed'); assert.match(result.stopReason, /Non-writable verification evidence drifted/);
    assert.equal(fake.observed.length, 1); assert.equal(fs.existsSync(path.join(fixture.root, 'output', 'verification')), false);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('denied, missing and stale report evidence never becomes review-ready', async () => {
  for (const report of ['denied', 'missing', 'stale']) {
    const fixture = setup(), fake = fakeRunner(fixture, {report});
    try {
      const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
      assert.equal(result.state, 'stopped-or-failed'); assert.equal(result.successorUnlocked, false);
    } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
  }
});

test('Markdown formatting cannot substitute for the exact plaintext provenance line', async () => {
  const fixture = setup(), fake = fakeRunner(fixture, {report: 'markdown-provenance'});
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase, randomBytes: () => Buffer.alloc(16, 7)});
    assert.equal(result.state, 'stopped-or-failed'); assert.equal(result.successorUnlocked, false);
    assert.equal(result.stopReason, 'Native report is missing the exact plaintext Guarded-Provenance line');
    assert.match(fs.readFileSync(path.join(fixture.workspace, 'HANDOFF.md'), 'utf8'), /\*\*Guarded-Provenance:\*\*/);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('preexisting handoff, off-scope predecessor and reset budgets are rejected before phases', async () => {
  const fixture = setup(), fake = fakeRunner(fixture);
  try {
    const badBudget = structuredClone(fixture.packet); badBudget.budgets.total.maxToolEvents = 5;
    assert.throws(() => validateGuardedPacket(badBudget), /exceed/);
    const predecessor = {packetId: 'prior', nextPacketId: 'packet-1', verified: true, handoffPath: path.join(fixture.root, 'prior.md'), handoffSha256: 'a'.repeat(64), sourceHashes: {'not-verified.mjs': 'b'.repeat(64)}};
    assert.throws(() => validateGuardedPacket({...fixture.packet, predecessor}), /predecessor/i);
    fs.writeFileSync(path.join(fixture.workspace, 'HANDOFF.md'), 'stale');
    await assert.rejects(() => runGuarded(fixture.packetPath, {runPhase: fake.runPhase}), /absent/);
    assert.equal(fake.observed.length, 0);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});

test('directory reads are rejected even when the native read tool is allowed', async () => {
  const fixture = setup();
  const fake = fakeRunner(fixture), base = fake.runPhase;
  fake.runPhase = async (packetPath, metadata) => {
    const result = await base(packetPath, metadata);
    if (metadata.phase === 'implement') {
      const p = JSON.parse(fs.readFileSync(packetPath)), file = path.join(p.output, 'events.jsonl');
      const events = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
      events.splice(1, 0, event('read', 'offscope', {filePath: p.workspace}));
      fs.writeFileSync(file, events.map(JSON.stringify).join('\n') + '\n');
    }
    return result;
  };
  try {
    const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
    assert.equal(result.state, 'stopped-or-failed'); assert.match(result.stopReason, /scope/); assert.equal(fake.observed.length, 1);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
});


test('trusted shim is reserved and byte or mode drift stops the attempt', async () => {
  const fixture = setup();
  try {
    const reservedFile = structuredClone(fixture.packet);
    reservedFile.readFiles.push('.open-lm-test'); reservedFile.verificationFiles.push('.open-lm-test');
    assert.throws(() => validateGuardedPacket(reservedFile), /reserved/);
    const reservedDirectory = structuredClone(fixture.packet); reservedDirectory.test.cwd = '.open-lm-test/nested';
    assert.throws(() => validateGuardedPacket(reservedDirectory), /reserved/);
  } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }

  for (const shimTamper of ['bytes', 'mode']) {
    const altered = setup(), fake = fakeRunner(altered, {shimTamper});
    try {
      const result = await runGuarded(altered.packetPath, {runPhase: fake.runPhase});
      assert.equal(result.state, 'stopped-or-failed'); assert.match(result.stopReason, /shim/);
      assert.equal(fake.observed.length, 2);
    } finally { fs.rmSync(altered.root, {recursive: true, force: true}); }
  }
});

test('guarded report acceptance enforces the decoded 180-word boundary', async () => {
  for (const [reportWords, expected] of [[180, 'guarded-review-ready'], [181, 'stopped-or-failed']]) {
    const fixture = setup(), fake = fakeRunner(fixture, {reportWords});
    try {
      const result = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
      assert.equal(result.state, expected);
      const text = fs.readFileSync(path.join(fixture.workspace, 'HANDOFF.md'), 'utf8');
      assert.equal(text.trim().split(/\s+/u).length, reportWords);
      if (reportWords > 180) assert.match(result.stopReason, /exceeds 180 words/);
    } finally { fs.rmSync(fixture.root, {recursive: true, force: true}); }
  }
});

test('SIGTERM and SIGINT abort guarded catalog preflight, persist failure, and leave no stale lease', async () => {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    const fixture = setup(), marker = path.join(fixture.root, 'unexpected-worker-spawn');
    const executable = path.join(fixture.root, 'must-not-run.mjs');
    fs.writeFileSync(executable, `#!/usr/bin/env node\nimport fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'spawned');\n`, {mode: 0o700});
    fixture.packet.executable = executable; fs.writeFileSync(fixture.packetPath, JSON.stringify(fixture.packet));
    const harness = path.join(fixture.root, 'interrupt-preflight.mjs');
    fs.writeFileSync(harness, `import {runGuarded} from ${JSON.stringify(new URL('./run-guarded.mjs', import.meta.url).href)};
globalThis.fetch=async(_url,{signal}={})=>{
  process.stdout.write('preflight-entered\\n');
  return await new Promise((resolve,reject)=>{
    const aborted=()=>reject(signal?.reason instanceof Error?signal.reason:Error('preflight aborted'));
    if(signal?.aborted)aborted();else signal?.addEventListener('abort',aborted,{once:true});
  });
};
const result=await runGuarded(process.argv[2]);
process.stdout.write('guarded-result '+JSON.stringify(result)+'\\n');
`);
    let stdout = '', stderr = '';
    const child = spawn(process.execPath, [harness, fixture.packetPath], {cwd: fixture.root, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('preflight marker timeout')), 5_000);
        const inspect = () => { if (stdout.includes('preflight-entered')) { clearTimeout(timeout); resolve(); } };
        child.stdout.on('data', inspect); child.once('error', reject); inspect();
      });
      const closedPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('interrupted runner did not close')), 8_000);
        child.once('error', reject); child.once('close', (code, childSignal) => { clearTimeout(timeout); resolve({code, signal: childSignal}); });
      });
      assert.equal(child.kill(signal), true);
      const closed = await closedPromise;
      assert.deepEqual(closed, {code: 0, signal: null}, stderr);
      const summaryPath = path.join(fixture.packet.output, 'guarded-summary.json');
      assert.equal(fs.existsSync(summaryPath), true);
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      assert.equal(summary.state, 'stopped-or-failed'); assert.match(summary.stopReason, /interrupted/i);
      assert.equal(summary.phases.length, 1); assert.equal(summary.phases[0].result.stopReason, 'interrupted');
      assert.equal(fs.existsSync(marker), false); assert.equal(fs.existsSync(workspaceLockPath(fixture.workspace)), false);
      fixture.packet.output = path.join(fixture.root, 'later-output'); fs.writeFileSync(fixture.packetPath, JSON.stringify(fixture.packet));
      const fake = fakeRunner(fixture), later = await runGuarded(fixture.packetPath, {runPhase: fake.runPhase});
      assert.equal(later.state, 'guarded-review-ready'); assert.equal(fs.existsSync(workspaceLockPath(fixture.workspace)), false);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      fs.rmSync(fixture.root, {recursive: true, force: true});
    }
  }
});
