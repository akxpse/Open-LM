import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {acquireWorkspaceLease,assertWorkspaceLease,releaseWorkspaceLease,workspaceLockPath} from './workspace-lock.mjs';

test('workspace lease is opaque, exclusive, scoped and reusable only until release', () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'open-lm-lock-'))), other = path.join(root, 'other');
  fs.mkdirSync(other);
  let lease, next;
  try {
    lease = acquireWorkspaceLease(root);
    assert.equal(Object.keys(lease).length, 0); assert.equal(Object.isFrozen(lease), true);
    assert.equal(assertWorkspaceLease(lease, root), lease);
    assert.throws(() => acquireWorkspaceLease(root), error => error?.code === 'EEXIST');
    assert.throws(() => assertWorkspaceLease(lease, other), /mismatched/);
    assert.throws(() => assertWorkspaceLease(Object.freeze({}), root), /Invalid/);
    assert.equal(fs.existsSync(workspaceLockPath(root)), true);
    assert.equal(releaseWorkspaceLease(lease), true); assert.equal(releaseWorkspaceLease(lease), false);
    assert.equal(fs.existsSync(workspaceLockPath(root)), false);
    next = acquireWorkspaceLease(root); assert.equal(assertWorkspaceLease(next, root), next);
  } finally {
    releaseWorkspaceLease(next); releaseWorkspaceLease(lease);
    fs.rmSync(root, {recursive: true, force: true});
  }
});
