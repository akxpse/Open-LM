import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const leases = new WeakMap();

function canonicalWorkspace(workspace) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) throw Error('Workspace lease requires an absolute directory');
  const real = fs.realpathSync(workspace), stat = fs.lstatSync(workspace);
  if (real !== path.resolve(workspace) || !stat.isDirectory() || stat.isSymbolicLink()) throw Error('Workspace lease requires a canonical real directory');
  return real;
}

export function workspaceLockPath(workspace) {
  const real = canonicalWorkspace(workspace);
  return path.join(os.tmpdir(), 'local-model-loop-' + crypto.createHash('sha256').update(real).digest('hex') + '.lock');
}

export function acquireWorkspaceLease(workspace) {
  const real = canonicalWorkspace(workspace), lockPath = workspaceLockPath(real);
  const fd = fs.openSync(lockPath, 'wx', 0o600), stat = fs.fstatSync(fd);
  const lease = Object.freeze(Object.create(null));
  leases.set(lease, {workspace: real, lockPath, fd, dev: stat.dev, ino: stat.ino, released: false});
  return lease;
}

export function assertWorkspaceLease(lease, workspace) {
  const record = leases.get(lease), real = canonicalWorkspace(workspace);
  if (!record || record.released || record.workspace !== real) throw Error('Invalid or mismatched workspace lease');
  const open = fs.fstatSync(record.fd), current = fs.lstatSync(record.lockPath);
  if (!current.isFile() || current.isSymbolicLink() || open.dev !== record.dev || open.ino !== record.ino || current.dev !== record.dev || current.ino !== record.ino) throw Error('Workspace lease evidence changed');
  return lease;
}

export function releaseWorkspaceLease(lease) {
  const record = leases.get(lease);
  if (!record || record.released) return false;
  record.released = true;
  try {
    const current = fs.lstatSync(record.lockPath);
    if (current.isFile() && !current.isSymbolicLink() && current.dev === record.dev && current.ino === record.ino) fs.unlinkSync(record.lockPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  } finally { fs.closeSync(record.fd); }
  return true;
}
