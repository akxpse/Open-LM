import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = ['run-local.test.mjs', 'run-local-lmstudio.test.mjs', 'handoff.test.mjs'];

test('relocated skill runs its complete runtime suite without repository state or dependencies', () => {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'open-lm-install-')));
  const installed = path.join(temporary, 'installed skill with spaces');
  fs.mkdirSync(installed);
  for (const name of ['SKILL.md', 'VERSION', 'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'prd.md', 'agents', 'assets', 'references', 'scripts', 'benchmarks']) {
    fs.cpSync(path.join(root, name), path.join(installed, name), {recursive: true, errorOnExist: true, force: false});
  }
  checkLinks(installed);
  assert.equal(fs.existsSync(path.join(installed, '.git')), false);
  assert.equal(fs.existsSync(path.join(installed, 'node_modules')), false);
  const childEnv = {...process.env};
  delete childEnv.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, ['--test', ...suites.map(name => path.join(installed, 'scripts', name))], {
    cwd: temporary, env: childEnv, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.match(output, /# fail 0/);
});

function checkLinks(project) {
  const docs = ['SKILL.md', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SECURITY.md', 'prd.md'];
  for (const folder of ['references', 'assets']) {
    for (const name of fs.readdirSync(path.join(project, folder))) {
      if (name.endsWith('.md')) docs.push(path.join(folder, name));
    }
  }
  for (const doc of docs) {
    const content = fs.readFileSync(path.join(project, doc), 'utf8');
    for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const href = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
      const filename = decodeURIComponent(href.split('#')[0]);
      const resolved = path.resolve(project, path.dirname(doc), filename);
      assert.ok(resolved.startsWith(path.resolve(project) + path.sep), `${doc}: link escapes project`);
      assert.ok(fs.existsSync(resolved), `${doc}: missing ${href}`);
    }
  }
}

test('maintained Markdown links resolve inside the distributed project', () => checkLinks(root));

test('release identity stays aligned across runtime and entrypoint', () => {
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(fs.readFileSync(path.join(root, 'scripts/run-local.mjs'), 'utf8').includes(`skillVersion:'${version}'`));
  assert.ok(fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8').includes(`Version: ${version}`));
  assert.ok(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').includes(`## ${version}`));
});
