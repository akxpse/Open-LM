import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runOnce, validateOnce} from './test-once.mjs';

const helperPath = fileURLToPath(new URL('./test-once.mjs', import.meta.url));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function fixture(body, changes = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'open-lm-once-')));
  const controlDir = path.join(root, 'control'), cwd = path.join(root, 'work');
  fs.mkdirSync(controlDir); fs.mkdirSync(cwd);
  const executable = path.join(root, 'test.mjs');
  fs.writeFileSync(executable, `#!/usr/bin/env node\n${body}\n`, {mode: 0o700});
  return {root, config: {version: 1, controlDir, cwd, executable, argv: [],
    markerPath: path.join(controlDir, 'claimed'), resultPath: path.join(controlDir, 'result.json'),
    stdoutPath: path.join(controlDir, 'stdout.log'), stderrPath: path.join(controlDir, 'stderr.log'),
    timeoutMs: 2_000, maxOutputBytes: 16_384, ...changes}};
}

test('one-shot execution records bounded direct PASS and FAIL evidence', async () => {
  for (const [code, expected] of [[0, 'PASS'], [3, 'FAIL']]) {
    const {root, config} = fixture(`console.log('out');console.error('err');process.exit(${code});`);
    try {
      const result = await runOnce(config);
      assert.equal(result.status, expected); assert.equal(result.exitCode, code);
      assert.equal(fs.readFileSync(result.stdoutPath, 'utf8'), 'out\n');
      assert.equal(fs.readFileSync(result.stderrPath, 'utf8'), 'err\n');
      assert.deepEqual(JSON.parse(fs.readFileSync(config.resultPath)), result);
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  }
});

test('parallel and repeated claims execute the test process at most once', async () => {
  const {root, config} = fixture("import fs from 'node:fs';fs.appendFileSync(process.argv[2],'hit\\n');setTimeout(()=>process.exit(0),100);");
  const effects = path.join(root, 'effects'); config.argv = [effects];
  try {
    const first = runOnce(config);
    await assert.rejects(() => runOnce(config));
    assert.equal((await first).status, 'PASS');
    assert.equal(fs.readFileSync(effects, 'utf8'), 'hit\n');
    await assert.rejects(() => runOnce(config));
    assert.equal(fs.readFileSync(effects, 'utf8'), 'hit\n');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('timeout and output overflow are UNKNOWN and still preserve evidence', async () => {
  for (const [body, changes, reason] of [
    ['setInterval(()=>{},1000);', {timeoutMs: 30}, 'wall-time-limit'],
    ["process.stdout.write('x'.repeat(10000));setInterval(()=>{},1000);", {maxOutputBytes: 128}, 'output-limit'],
  ]) {
    const {root, config} = fixture(body, changes);
    try {
      const result = await runOnce(config);
      assert.equal(result.status, 'UNKNOWN'); assert.equal(result.stopReason, reason);
      assert.ok(fs.existsSync(config.resultPath));
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  }
});

test('SIGTERM is forwarded to the detached test group before UNKNOWN evidence is written', {skip: process.platform === 'win32'}, async () => {
  const {root, config} = fixture('');
  const started = path.join(root, 'started'), late = path.join(root, 'late-effect');
  const descendant = `import fs from 'node:fs';setTimeout(()=>fs.writeFileSync(${JSON.stringify(late)},'late'),600);setInterval(()=>{},1000);`;
  fs.writeFileSync(config.executable, `#!/usr/bin/env node\nimport fs from 'node:fs';import {spawn} from 'node:child_process';fs.writeFileSync(${JSON.stringify(started)},'started');spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000);\n`, {mode: 0o700});
  const configPath = path.join(root, 'config.json'); fs.writeFileSync(configPath, JSON.stringify(config));
  let helper;
  try {
    helper = spawn(process.execPath, [helperPath, configPath], {detached: true, stdio: 'ignore'});
    for (let i = 0; i < 100 && !fs.existsSync(started); i++) await wait(10);
    assert.equal(fs.existsSync(started), true);
    process.kill(-helper.pid, 'SIGTERM');
    const closed = await new Promise(resolve => helper.once('close', (code, signal) => resolve({code, signal})));
    assert.equal(closed.code, 2); assert.equal(closed.signal, null);
    assert.equal(JSON.parse(fs.readFileSync(config.resultPath)).status, 'UNKNOWN');
    assert.equal(JSON.parse(fs.readFileSync(config.resultPath)).stopReason, 'interrupted');
    await wait(750);
    assert.equal(fs.existsSync(late), false);
  } finally {
    if (helper?.pid) { try { process.kill(-helper.pid, 'SIGKILL'); } catch {} }
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('validation rejects shell-like, aliased and stale control surfaces', () => {
  const {root, config} = fixture('process.exit(0);');
  try {
    assert.throws(() => validateOnce({...config, executable: 'node'}));
    assert.throws(() => validateOnce({...config, argv: ['x\0y']}));
    assert.throws(() => validateOnce({...config, resultPath: config.markerPath}));
    fs.writeFileSync(config.markerPath, 'stale');
    assert.throws(() => validateOnce(config));
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
