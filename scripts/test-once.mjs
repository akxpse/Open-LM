#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const inside = (root, item) => item === root || item.startsWith(root + path.sep);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw Error(`Invalid ${name}`);
  return value;
}
function realDirectory(value, name) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value) throw Error(`${name} must be absolute and canonical`);
  const real = fs.realpathSync(value), stat = fs.lstatSync(value);
  if (real !== value || !stat.isDirectory() || stat.isSymbolicLink()) throw Error(`${name} must be a real directory`);
  return real;
}
function freshControlFile(value, control, name) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value || !inside(control, value) || value === control) throw Error(`${name} must be an absolute canonical control path`);
  const parent = fs.realpathSync(path.dirname(value));
  if (!inside(control, parent) || fs.existsSync(value)) throw Error(`${name} must be a fresh control file`);
  return value;
}

export function validateOnce(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid test-once configuration');
  const controlDir = realDirectory(input.controlDir, 'controlDir'), cwd = realDirectory(input.cwd, 'cwd');
  if (inside(cwd, controlDir) || inside(controlDir, cwd)) throw Error('Control and test directories must be separate');
  if (typeof input.executable !== 'string' || !path.isAbsolute(input.executable) || path.resolve(input.executable) !== input.executable) throw Error('executable must be absolute and canonical');
  const executable = fs.realpathSync(input.executable), executableStat = fs.lstatSync(input.executable);
  if (executable !== input.executable || !executableStat.isFile() || executableStat.isSymbolicLink()) throw Error('executable must be a regular nonsymlink file');
  fs.accessSync(executable, fs.constants.X_OK);
  if (!Array.isArray(input.argv) || input.argv.length > 64 || input.argv.some(arg => typeof arg !== 'string' || arg.length > 4096 || arg.includes('\0'))) throw Error('argv must contain bounded strings');
  const paths = Object.fromEntries(['markerPath', 'resultPath', 'stdoutPath', 'stderrPath'].map(name => [name, freshControlFile(input[name], controlDir, name)]));
  if (new Set(Object.values(paths)).size !== 4) throw Error('Control evidence paths must differ');
  return {version: 1, controlDir, cwd, executable, argv: [...input.argv], ...paths,
    timeoutMs: integer(input.timeoutMs, 'timeoutMs', 1, 600_000),
    maxOutputBytes: integer(input.maxOutputBytes, 'maxOutputBytes', 1, 8 * 1024 * 1024)};
}

export async function runOnce(input, dependencies = {}) {
  const p = validateOnce(input), spawnProcess = dependencies.spawn ?? spawn, now = dependencies.now ?? Date.now;
  const started = now();
  let markerFd;
  try {
    markerFd = fs.openSync(p.markerPath, 'wx', 0o600);
    fs.writeFileSync(markerFd, JSON.stringify({version: 1, state: 'claimed'}) + '\n');
  } catch (cause) {
    const error = Error('Test execution was already claimed or control evidence is unavailable', {cause});
    error.code = 'TEST_ALREADY_CLAIMED';
    throw error;
  } finally { if (markerFd !== undefined) fs.closeSync(markerFd); }

  let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), stopReason = null, spawnError = null, child, killTimer;
  let seenBytes = 0;
  const append = (current, chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    seenBytes += bytes.length;
    const remaining = Math.max(0, p.maxOutputBytes - stdout.length - stderr.length);
    return Buffer.concat([current, bytes.subarray(0, remaining)]);
  };
  const stop = (reason, forward = 'SIGKILL') => {
    if (stopReason) return;
    stopReason = reason;
    if (!child?.pid) return;
    const target = process.platform === 'win32' ? child.pid : -child.pid;
    try { process.kill(target, forward); } catch {}
    if (forward !== 'SIGKILL') killTimer = setTimeout(() => { try { process.kill(target, 'SIGKILL'); } catch {} }, 750);
  };
  const interrupt = () => stop('interrupted', 'SIGTERM');
  let exitCode = null, signal = null, timer;
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  try {
    child = spawnProcess(p.executable, p.argv, {cwd: p.cwd,
      env: {PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C'},
      detached: process.platform !== 'win32', shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout?.on('data', chunk => { stdout = append(stdout, chunk); if (seenBytes > p.maxOutputBytes) stop('output-limit'); });
    child.stderr?.on('data', chunk => { stderr = append(stderr, chunk); if (seenBytes > p.maxOutputBytes) stop('output-limit'); });
    timer = setTimeout(() => stop('wall-time-limit'), p.timeoutMs);
    ({exitCode, signal, spawnError} = await new Promise(resolve => {
      child.once('error', error => resolve({exitCode: null, signal: null, spawnError: error}));
      child.once('close', (code, sig) => resolve({exitCode: code, signal: sig, spawnError: null}));
    }));
    if (process.platform !== 'win32' && child?.pid) {
      const group = -child.pid;
      try {
        process.kill(group, 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 100));
        try { process.kill(group, 'SIGKILL'); } catch {}
      } catch {}
    }
  } catch (error) { spawnError = error; }
  finally {
    clearTimeout(timer); clearTimeout(killTimer);
    process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  }

  const status = spawnError || exitCode === null || stopReason ? 'UNKNOWN' : exitCode === 0 ? 'PASS' : 'FAIL';
  fs.writeFileSync(p.stdoutPath, stdout, {flag: 'wx', mode: 0o600});
  fs.writeFileSync(p.stderrPath, stderr, {flag: 'wx', mode: 0o600});
  const result = {version: 1, status, exitCode: Number.isInteger(exitCode) ? exitCode : null,
    signal: typeof signal === 'string' ? signal : null, stopReason, stdoutBytes: stdout.length, stderrBytes: stderr.length,
    stdoutSha256: hash(stdout), stderrSha256: hash(stderr), stdoutPath: p.stdoutPath, stderrPath: p.stderrPath,
    elapsedMs: Math.max(0, now() - started), executable: p.executable, argv: p.argv, cwd: p.cwd};
  fs.writeFileSync(p.resultPath, JSON.stringify(result) + '\n', {flag: 'wx', mode: 0o600});
  return result;
}

function readConfig(filename) {
  if (!path.isAbsolute(filename) || path.resolve(filename) !== filename) throw Error('Configuration path must be absolute and canonical');
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 || fs.realpathSync(filename) !== filename) throw Error('Configuration must be a bounded regular nonsymlink file');
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw Error('Expected one absolute configuration path');
    const result = await runOnce(readConfig(process.argv[2]));
    console.log(JSON.stringify(result));
    process.exitCode = result.status === 'PASS' ? 0 : result.status === 'FAIL' ? 1 : 2;
  } catch {
    console.error(JSON.stringify({version: 1, status: 'UNKNOWN', reason: 'Test control validation or execution failed'}));
    process.exitCode = 2;
  }
}
