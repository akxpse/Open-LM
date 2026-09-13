import {pathToFileURL} from 'node:url';
import {parseJobs} from './parser.mjs';
import {planJobs} from './planner.mjs';

export function processText(text, options = {}) {
  const parsed = parseJobs(text);
  const planned = planJobs(parsed.jobs, options);
  return {
    accepted: parsed.jobs.length,
    errors: parsed.errors,
    batches: planned.batches,
    duplicates: planned.duplicates,
    filtered: planned.filtered,
  };
}

function parseArguments(args) {
  const options = {};
  const seen = new Set();
  const definitions = new Map([
    ['--batch-size', ['batchSize', 1, 50]],
    ['--max-attempts', ['maxAttempts', 1, 100]],
  ]);

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const definition = definitions.get(flag);
    const raw = args[index + 1];
    if (definition === undefined || seen.has(flag) || raw === undefined || !/^\d+$/.test(raw)) {
      throw new TypeError('invalid arguments');
    }
    const value = Number(raw);
    const [name, minimum, maximum] = definition;
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new TypeError('invalid arguments');
    }
    seen.add(flag);
    options[name] = value;
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch {
    process.stderr.write('INVALID_ARGUMENTS\n');
    process.exitCode = 2;
    return;
  }

  try {
    let text = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) text += chunk;
    process.stdout.write(`${JSON.stringify(processText(text, options))}\n`);
  } catch {
    process.stderr.write('INTERNAL_ERROR\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
