import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {preparePredecessor, snapshotHandoff} from './handoff.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'open-lm-handoff-')));
  const workspace = path.join(root, 'work');
  const control = path.join(root, 'control');
  const output = path.join(root, 'output');
  fs.mkdirSync(workspace); fs.mkdirSync(control); fs.mkdirSync(output);
  fs.writeFileSync(path.join(workspace, 'source.mjs'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(workspace, 'HANDOFF.md'), 'Implemented source.mjs and verified its contract.\n');
  const handoffPath = path.join(control, 'HANDOFF.md');
  fs.writeFileSync(handoffPath, 'Packet one complete.\n');
  const predecessor = {
    packetId: 'packet-1', nextPacketId: 'packet-2', verified: true, handoffPath,
    handoffSha256: sha('Packet one complete.\n'),
    sourceHashes: {'source.mjs': sha('export const value = 1;\n')},
  };
  return {root, workspace, control, output, predecessor,
    packet: {packetId: 'packet-2', workspace, readFiles: ['source.mjs'], writeFiles: ['source.mjs', 'HANDOFF.md'], predecessor}};
}

test('clean frontier-attested predecessor link returns compact untrusted prompt evidence without mutation', () => {
  const f = fixture();
  const before = JSON.stringify(f.packet);
  const result = preparePredecessor(f.packet);
  assert.deepEqual(result, {
    packetId: 'packet-1', nextPacketId: 'packet-2', handoffSha256: f.predecessor.handoffSha256,
    sourceHashes: f.predecessor.sourceHashes, handoffText: 'Packet one complete.\n', verification: 'frontier-attested',
  });
  assert.equal(JSON.stringify(f.packet), before);
  assert.equal(preparePredecessor({...f.packet, predecessor: null}), null);
});

test('missing and stale predecessor handoff fail closed', () => {
  const f = fixture();
  fs.unlinkSync(f.predecessor.handoffPath);
  assert.throws(() => preparePredecessor(f.packet));
  fs.writeFileSync(f.predecessor.handoffPath, 'changed\n');
  assert.throws(() => preparePredecessor(f.packet), /Stale predecessor handoff/);
});

test('unverified, wrong-next, and self links fail closed', () => {
  const f = fixture();
  assert.throws(() => preparePredecessor({...f.packet, predecessor: {...f.predecessor, verified: false}}), /frontier verification/);
  assert.throws(() => preparePredecessor({...f.packet, predecessor: {...f.predecessor, nextPacketId: 'packet-3'}}), /mismatch/);
  assert.throws(() => preparePredecessor({...f.packet, packetId: 'packet-1'}), /itself/);
});

test('stale predecessor source fails closed', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.workspace, 'source.mjs'), 'export const value = 2;\n');
  assert.throws(() => preparePredecessor(f.packet), /Stale predecessor source/);
});

test('handoff and source paths reject workspace placement, aliases, and symlink escape', () => {
  const inside = fixture();
  const insidePath = path.join(inside.workspace, 'prior.md');
  fs.writeFileSync(insidePath, 'Packet one complete.\n');
  assert.throws(() => preparePredecessor({...inside.packet, predecessor: {...inside.predecessor, handoffPath: insidePath}}), /outside workspace/);

  const handoffLink = fixture();
  const link = path.join(handoffLink.control, 'link.md');
  fs.symlinkSync(handoffLink.predecessor.handoffPath, link);
  assert.throws(() => preparePredecessor({...handoffLink.packet, predecessor: {...handoffLink.predecessor, handoffPath: link}}), /nonsymlink/);

  const sourceLink = fixture();
  const external = path.join(sourceLink.control, 'external.mjs');
  fs.writeFileSync(external, 'external\n');
  fs.symlinkSync(external, path.join(sourceLink.workspace, 'linked.mjs'));
  const predecessor = {...sourceLink.predecessor, sourceHashes: {'linked.mjs': sha('external\n')}};
  assert.throws(() => preparePredecessor({...sourceLink.packet, readFiles: ['linked.mjs'], predecessor}), /nonsymlink/);

  const alias = fixture();
  assert.throws(() => preparePredecessor({...alias.packet, predecessor: {...alias.predecessor, sourceHashes: {'./source.mjs': alias.predecessor.sourceHashes['source.mjs']}}}), /Invalid predecessor source hash/);
});

test('explicit read scope must contain every predecessor source', () => {
  const f = fixture();
  assert.throws(() => preparePredecessor({...f.packet, readFiles: ['other.mjs']}), /outside read scope/);
  assert.doesNotThrow(() => preparePredecessor({...f.packet, readFiles: undefined}));
});

test('snapshot preserves raw handoff and hashes after workspace replacement', () => {
  const f = fixture();
  const metadata = snapshotHandoff(f.packet, f.output);
  const original = 'Implemented source.mjs and verified its contract.\n';
  assert.deepEqual(metadata, {
    packetId: 'packet-2', verified: false, handoffPath: path.join(f.output, 'HANDOFF.md'),
    handoffSha256: sha(original), sourceHashes: {'source.mjs': sha('export const value = 1;\n')},
  });
  assert.equal(fs.readFileSync(metadata.handoffPath, 'utf8'), original);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.output, 'handoff.json'), 'utf8')), metadata);
  assert.equal(fs.statSync(metadata.handoffPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(f.output, 'handoff.json')).mode & 0o777, 0o600);

  fs.writeFileSync(path.join(f.workspace, 'HANDOFF.md'), 'replacement\n');
  assert.equal(fs.readFileSync(metadata.handoffPath, 'utf8'), original);
  const next = {...f.packet, packetId: 'packet-3', predecessor: {...metadata, packetId: 'packet-2', nextPacketId: 'packet-3', verified: true}};
  assert.equal(preparePredecessor(next).handoffText, original);
});

test('snapshot never overwrites either destination', () => {
  for (const occupied of ['HANDOFF.md', 'handoff.json']) {
    const f = fixture();
    const destination = path.join(f.output, occupied);
    fs.writeFileSync(destination, 'protected');
    assert.throws(() => snapshotHandoff(f.packet, f.output), /already exists/);
    assert.equal(fs.readFileSync(destination, 'utf8'), 'protected');
    assert.equal(fs.existsSync(path.join(f.output, occupied === 'HANDOFF.md' ? 'handoff.json' : 'HANDOFF.md')), false);
  }
});

test('missing workspace handoff returns null without creating output', () => {
  const f = fixture();
  fs.unlinkSync(path.join(f.workspace, 'HANDOFF.md'));
  assert.equal(snapshotHandoff(f.packet, f.output), null);
  assert.deepEqual(fs.readdirSync(f.output), []);
});

test('snapshot rejects symlink handoff and output inside workspace', () => {
  const linked = fixture();
  fs.unlinkSync(path.join(linked.workspace, 'HANDOFF.md'));
  fs.symlinkSync(linked.predecessor.handoffPath, path.join(linked.workspace, 'HANDOFF.md'));
  assert.throws(() => snapshotHandoff(linked.packet, linked.output), /nonsymlink/);

  const nested = fixture();
  const output = path.join(nested.workspace, 'evidence');
  fs.mkdirSync(output);
  assert.throws(() => snapshotHandoff(nested.packet, output), /outside workspace/);
});

test('malformed predecessor values are rejected rather than treated as no link', () => {
  const f = fixture();
  for (const predecessor of [false, 0, '', [], 'packet-1']) {
    assert.throws(() => preparePredecessor({...f.packet, predecessor}), /Invalid predecessor/);
  }
});

test('oversized and invalid UTF-8 handoffs cannot enter successor context', () => {
  const f = fixture();
  for (const bytes of [Buffer.alloc(16 * 1024 + 1, 65), Buffer.from([0xc3, 0x28])]) {
    fs.writeFileSync(f.predecessor.handoffPath, bytes);
    const predecessor = {...f.predecessor, handoffSha256: sha(bytes)};
    assert.throws(() => preparePredecessor({...f.packet, predecessor}), /too large|UTF-8/);
    fs.writeFileSync(path.join(f.workspace, 'HANDOFF.md'), bytes);
    assert.throws(() => snapshotHandoff(f.packet, f.output), /too large|UTF-8/);
    assert.deepEqual(fs.readdirSync(f.output), []);
  }
});

test('duplicate hard-linked source identities are rejected', () => {
  const f = fixture();
  fs.linkSync(path.join(f.workspace, 'source.mjs'), path.join(f.workspace, 'alias.mjs'));
  const predecessor = {...f.predecessor, sourceHashes: {...f.predecessor.sourceHashes, 'alias.mjs': f.predecessor.sourceHashes['source.mjs']}};
  assert.throws(() => preparePredecessor({...f.packet, readFiles: ['source.mjs', 'alias.mjs'], predecessor}), /Aliased/);
});
