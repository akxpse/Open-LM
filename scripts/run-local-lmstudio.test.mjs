import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validate,config,summarize,run} from './run-local.mjs';

const base={workspace:'/tmp/work',task:'/tmp/control/task.md',output:'/tmp/control/out',writeFiles:['sum.mjs'],commands:['node --test test.mjs'],reviewedConfig:true};

// Test 1: validate defaults to ollama with port11434; runtime lmstudio defaults to port1234 and requires explicit model; invalid runtime, missing/blank LM model, and remote LM endpoint all throw.
test('LM Studio validation tests', () => {
  // Default should be ollama
  assert.doesNotThrow(() => validate({...base}));

  // LM Studio default port and model requirement
  assert.throws(() => validate({...base, runtime: 'lmstudio'}));
  assert.doesNotThrow(() => validate({...base, runtime: 'lmstudio', model: 'test-qwen'}));

  // Invalid runtime should throw
  assert.throws(() => validate({...base, runtime: 'invalid'}));

  // Remote endpoint should throw
  assert.throws(() => validate({...base, runtime: 'lmstudio', model: 'test-qwen', baseURL: 'http://example.com/v1'}));

  // Blank model should throw for LM Studio
  assert.throws(() => validate({...base, runtime: 'lmstudio', model: ''}));

  // Validate default URLs
  const ollamaConfig = validate({...base});
  assert.equal(ollamaConfig.baseURL, 'http://127.0.0.1:11434/v1');

  const lmstudioConfig = validate({...base, runtime: 'lmstudio', model: 'test-qwen'});
  assert.equal(lmstudioConfig.baseURL, 'http://127.0.0.1:1234/v1');

  // Validate whitespace-only LM model rejection
  assert.throws(() => validate({...base, runtime: 'lmstudio', model: '   '}));
});

// Test 2: config(validate(...lmstudio...)) enables only lmstudio, provider key lmstudio, baseURL /v1, model and small_model lmstudio/test-qwen, and every agent's model same. Permissions still deny unknown shell and external directory. With LM_API_TOKEN absent apiKey is omitted; with fake-test-token set apiKey is literal {env:LM_API_TOKEN} and serialized config does not contain the fake token. Restore the original env after the test.
test('LM Studio configuration tests', () => {
  // Save original environment at start
  const originalToken = process.env.LM_API_TOKEN;

  try {
    // Test without LM_API_TOKEN
    delete process.env.LM_API_TOKEN;
    const c1 = config(validate({...base, runtime: 'lmstudio', model: 'test-qwen'}));
    assert.equal(c1.enabled_providers[0], 'lmstudio');
    assert.equal(c1.provider.lmstudio.name, 'Local LM Studio');
    assert.ok(c1.provider.lmstudio.options.baseURL.includes('/v1'));
    assert.equal(c1.model, 'lmstudio/test-qwen');
    assert.equal(c1.small_model, 'lmstudio/test-qwen');
    assert.equal(c1.agent['local-worker'].model, 'lmstudio/test-qwen');
    assert.equal(c1.agent.compaction.model, 'lmstudio/test-qwen');
    assert.equal(c1.agent.title.model, 'lmstudio/test-qwen');
    assert.equal(c1.agent.summary.model, 'lmstudio/test-qwen');
    assert.equal(c1.permission.bash['*'], 'deny');
    assert.equal(c1.permission.external_directory, 'deny');

    // Test with LM_API_TOKEN
    process.env.LM_API_TOKEN = 'fake-test-token';
    const c2 = config(validate({...base, runtime: 'lmstudio', model: 'test-qwen'}));
    assert.equal(c2.provider.lmstudio.options.apiKey, '{env:LM_API_TOKEN}');

    // Verify token is not in serialized config
    const serialized = JSON.stringify(c2);
    assert.ok(!serialized.includes('fake-test-token'));
  } finally {
    // Restore original environment
    if (originalToken === undefined) {
      delete process.env.LM_API_TOKEN;
    } else {
      process.env.LM_API_TOKEN = originalToken;
    }
  }
});

// Test 3: A mocked LM run: fresh temporary Git root outside control files; valid packet runtime lmstudio model test-qwen; synthetic executable emits normal step_finish stop only if process.argv contains '-m' followed by 'lmstudio/test-qwen', otherwise exits nonzero. Stub fetch to return data:[{id:'test-qwen'}], record request URL and Authorization header using fake-test-token env. Assert URL http://127.0.0.1:1234/v1/models, Bearer header, summary.runtime lmstudio, state review-ready, accepted:false. Assert summary JSON has no fake token.
test('LM Studio mocked run test', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-loop-lmstudio-test-'));
  const workspace = path.join(root, 'work');
  fs.mkdirSync(workspace);
  execFileSync('git', ['init', '--quiet', workspace]);

  // Set up test environment
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.LM_API_TOKEN;

  try {
    let capturedUrl, capturedHeaders;

    // Setup fetch mock with fake token
    process.env.LM_API_TOKEN = 'fake-test-token';
    globalThis.fetch = async (url, options) => {
      capturedUrl = url.toString();
      capturedHeaders = options?.headers || {};

      // Return mock model data for valid URL
      if (url.toString().includes('/v1/models')) {
        return {
          ok: true,
          json: async () => ({data: [{id: 'test-qwen'}]})
        };
      }

      throw new Error('Unexpected fetch call');
    };

    // Create synthetic executable that checks arguments
    const executable = path.join(root, 'mock-exec.mjs');
    fs.writeFileSync(executable, `#!/usr/bin/env node
import {spawn} from 'node:child_process';
if(process.argv.includes('-m') && process.argv[process.argv.indexOf('-m')+1] === 'lmstudio/test-qwen') {
  console.log(JSON.stringify({type:'step_finish',part:{reason:'stop'}}));
} else {
  process.exit(1);
}`, {mode: 0o700});

    const task = path.join(root, 'task.md');
    fs.writeFileSync(task, 'Synthetic test');

    const packet = path.join(root, 'test.json');
    fs.writeFileSync(packet, JSON.stringify({
      ...base,
      workspace,
      task,
      output: path.join(root, 'out'),
      executable,
      runtime: 'lmstudio',
      model: 'test-qwen'
    }));

    // Run the test
    const result = await run(packet);

    // Assertions
    assert.equal(result.runtime, 'lmstudio');
    assert.equal(result.state, 'review-ready');
    assert.equal(result.accepted, false);

    // Verify URL and headers
    assert.ok(capturedUrl.includes('http://127.0.0.1:1234/v1/models'));
    assert.ok(capturedHeaders['Authorization'] === `Bearer ${process.env.LM_API_TOKEN}`);

    // Verify no token in summary JSON
    const summaryPath = path.join(root, 'out', 'summary.json');
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    assert.ok(!summaryContent.includes('fake-test-token'));

  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.LM_API_TOKEN;
    } else {
      process.env.LM_API_TOKEN = originalToken;
    }
    // Clean up temp directory
    try {
      fs.rmSync(root, { recursive: true });
    } catch {}
  }
});

// Test 4: Same mocked-run setup rejects a catalog with the wrong model ID and HTTP401. Fake HTTP401 body should contain fake-test-token, but error text must not contain it. Use unique output paths. Restore fetch and env in finally. Ensure mock responses supply ok/status/json as needed. Do not weaken old assertions or skip tests.
// Test 4: Same mocked-run setup rejects a catalog with the wrong model ID and HTTP401. Fake HTTP401 body should contain fake-test-token, but error text must not contain it. Use unique output paths. Restore fetch and env in finally. Ensure mock responses supply ok/status/json as needed. Do not weaken old assertions or skip tests.
// Also test preflight rejection for wrong model ID.
test('LM Studio catalog rejection test', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-loop-lmstudio-reject-test-'));
  const workspace = path.join(root, 'work');
  fs.mkdirSync(workspace);
  execFileSync('git', ['init', '--quiet', workspace]);

  // Set up test environment
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.LM_API_TOKEN;

  try {
    // Setup fetch mock that returns HTTP401 with token in body
    process.env.LM_API_TOKEN = 'fake-test-token';
    globalThis.fetch = async (url, options) => {
      return {
        ok: false,
        status: 401,
        json: async () => ({error: `Authentication failed for token ${process.env.LM_API_TOKEN}`})
      };
    };

    // Create synthetic executable
    const executable = path.join(root, 'mock-exec.mjs');
    fs.writeFileSync(executable, `#!/usr/bin/env node
console.log(JSON.stringify({type:'step_finish',part:{reason:'stop'}}));
 `, {mode: 0o700});

    const task = path.join(root, 'task.md');
    fs.writeFileSync(task, 'Synthetic test');

    const packet = path.join(root, 'test.json');
    fs.writeFileSync(packet, JSON.stringify({
      ...base,
      workspace,
      task,
      output: path.join(root, 'out'),
      executable,
      runtime: 'lmstudio',
      model: 'wrong-model'
    }));

    // First test: HTTP401 preflight error
    await assert.rejects(() => run(packet), error => {
      assert.match(error.message,/preflight failed/);
      assert.equal(error.message.includes('fake-test-token'),false);
      return true;
    });

    // Second test: wrong model ID preflight rejection (should also throw before launch)
    globalThis.fetch = async (url, options) => {
      // Return status 200 with different model in the response to simulate "not installed"
      if (url.toString().includes('/v1/models')) {
        return {
          ok: true,
          json: async () => ({data: [{id:'different-model'}]})
        };
      }

      throw new Error('Unexpected fetch call');
    };

    await assert.rejects(() => run(packet),/not installed/);

  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.LM_API_TOKEN;
    } else {
      process.env.LM_API_TOKEN = originalToken;
    }
    // Clean up temp directory
    try {
      fs.rmSync(root, { recursive: true });
    } catch {}
  }
});
