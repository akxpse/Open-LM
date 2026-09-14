import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_HANDOFF_BYTES = 16 * 1024;
const HASH = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const inside = (root, item) => item === root || item.startsWith(root + path.sep);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function safeId(value, field) {
  if (typeof value !== 'string' || !ID.test(value)) throw Error(`Invalid ${field}`);
  return value;
}

function relativeFile(value) {
  return typeof value === 'string' && value.length > 0 && value !== '.' &&
    !path.posix.isAbsolute(value) && path.posix.normalize(value) === value &&
    !value.endsWith('/') && !value.includes('\\') &&
    !value.split('/').includes('..') && !/[*?\[\]{}\n\r]/.test(value);
}

function sourceEntries(sourceHashes) {
  if (!sourceHashes || Array.isArray(sourceHashes) || typeof sourceHashes !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(sourceHashes))) throw Error('Invalid predecessor sourceHashes');
  const entries = Object.entries(sourceHashes);
  if (entries.length === 0) throw Error('predecessor sourceHashes must be nonempty');
  for (const [file, hash] of entries) {
    if (!relativeFile(file) || typeof hash !== 'string' || !HASH.test(hash)) throw Error('Invalid predecessor source hash');
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}

function canonicalDirectory(value, field) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw Error(`${field} must be absolute`);
  const real = fs.realpathSync(value);
  const stat = fs.lstatSync(real);
  if (real !== path.resolve(value) || !stat.isDirectory() || stat.isSymbolicLink()) throw Error(`${field} must be a real directory`);
  return real;
}

function regularBytes(filename, limit = Infinity) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw Error('Evidence path must be absolute');
  const lexical = path.resolve(filename);
  if (filename !== lexical) throw Error('Evidence path must be canonical');
  const before = fs.lstatSync(lexical);
  if (!before.isFile() || before.isSymbolicLink()) throw Error('Evidence must be a regular nonsymlink file');
  const real = fs.realpathSync(lexical);
  if (real !== lexical) throw Error('Evidence path must be canonical');
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(real, flags);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > limit) throw Error('Evidence file is invalid or too large');
    const bytes = fs.readFileSync(fd);
    if (bytes.length > limit) throw Error('Evidence file is too large');
    return {bytes, real, stat};
  } finally {
    fs.closeSync(fd);
  }
}

function text(bytes) {
  try { return new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { throw Error('HANDOFF.md must be valid UTF-8'); }
}

function workspaceSource(workspace, file) {
  if (!relativeFile(file)) throw Error('Invalid source path');
  const target = path.join(workspace, ...file.split('/'));
  const record = regularBytes(target);
  if (!inside(workspace, record.real)) throw Error('Source escapes workspace');
  return record;
}

export function preparePredecessor(p) {
  if (p?.predecessor === undefined || p?.predecessor === null) return null;
  const packetId = safeId(p.packetId, 'packetId');
  const predecessor = p.predecessor;
  if (!predecessor || typeof predecessor !== 'object' || Array.isArray(predecessor)) throw Error('Invalid predecessor');
  const predecessorId = safeId(predecessor.packetId, 'predecessor packetId');
  const nextPacketId = safeId(predecessor.nextPacketId, 'predecessor nextPacketId');
  if (predecessorId === packetId) throw Error('Predecessor cannot link to itself');
  if (nextPacketId !== packetId) throw Error('Predecessor nextPacketId mismatch');
  if (predecessor.verified !== true) throw Error('Predecessor requires frontier verification');
  if (typeof predecessor.handoffSha256 !== 'string' || !HASH.test(predecessor.handoffSha256)) throw Error('Invalid handoff hash');

  const workspace = canonicalDirectory(p.workspace, 'workspace');
  const handoff = regularBytes(predecessor.handoffPath, MAX_HANDOFF_BYTES);
  if (inside(workspace, handoff.real)) throw Error('Predecessor handoff must be outside workspace');
  if (sha256(handoff.bytes) !== predecessor.handoffSha256) throw Error('Stale predecessor handoff');

  const entries = sourceEntries(predecessor.sourceHashes);
  if (p.readFiles !== undefined) {
    if (!Array.isArray(p.readFiles) || p.readFiles.some(file => !relativeFile(file))) throw Error('Invalid readFiles');
    const readable = new Set(p.readFiles);
    if (entries.some(([file]) => !readable.has(file))) throw Error('Predecessor source is outside read scope');
  }
  const identities = new Set();
  for (const [file, expected] of entries) {
    const current = workspaceSource(workspace, file);
    const identity = `${current.stat.dev}:${current.stat.ino}`;
    if (identities.has(identity)) throw Error('Aliased predecessor sources are not allowed');
    identities.add(identity);
    if (sha256(current.bytes) !== expected) throw Error('Stale predecessor source');
  }

  return {
    packetId: predecessorId,
    nextPacketId,
    handoffSha256: predecessor.handoffSha256,
    sourceHashes: Object.fromEntries(entries),
    handoffText: text(handoff.bytes),
    verification: 'frontier-attested',
  };
}

export function snapshotHandoff(p, output) {
  const workspace = canonicalDirectory(p.workspace, 'workspace');
  const sourcePath = path.join(workspace, 'HANDOFF.md');
  if (!fs.existsSync(sourcePath)) return null;
  const handoff = regularBytes(sourcePath, MAX_HANDOFF_BYTES);
  if (!inside(workspace, handoff.real) || handoff.real !== sourcePath) throw Error('HANDOFF.md escapes workspace');
  text(handoff.bytes);

  if (p.packetId !== undefined && p.packetId !== null) safeId(p.packetId, 'packetId');
  if (!Array.isArray(p.writeFiles)) throw Error('writeFiles must be an array');
  const hashes = [];
  for (const file of p.writeFiles) {
    if (!relativeFile(file)) throw Error('Invalid writeFiles source path');
    if (file === 'HANDOFF.md') continue;
    const candidate = path.join(workspace, ...file.split('/'));
    if (!fs.existsSync(candidate)) continue;
    hashes.push([file, sha256(workspaceSource(workspace, file).bytes)]);
  }
  hashes.sort(([a], [b]) => a.localeCompare(b));

  const outputDir = canonicalDirectory(output, 'output');
  if (inside(workspace, outputDir)) throw Error('Handoff snapshot output must be outside workspace');
  const handoffPath = path.join(outputDir, 'HANDOFF.md');
  const metadataPath = path.join(outputDir, 'handoff.json');
  if (fs.existsSync(handoffPath) || fs.existsSync(metadataPath)) throw Error('Handoff snapshot already exists');
  const metadata = {
    packetId: p.packetId ?? null,
    verified: false,
    handoffPath,
    handoffSha256: sha256(handoff.bytes),
    sourceHashes: Object.fromEntries(hashes),
  };
  fs.writeFileSync(handoffPath, handoff.bytes, {flag: 'wx', mode: 0o600});
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata) + '\n', {flag: 'wx', mode: 0o600});
  } catch (cause) {
    const error = Error('Partial handoff snapshot: raw handoff exists but metadata was not written', {cause});
    error.code = 'HANDOFF_SNAPSHOT_PARTIAL';
    throw error;
  }
  return metadata;
}
