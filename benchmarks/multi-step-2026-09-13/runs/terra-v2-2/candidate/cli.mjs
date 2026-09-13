import {pathToFileURL} from 'node:url';
import {parseJobs} from './parser.mjs';
import {planJobs} from './planner.mjs';

export function processText(text, options = {}) {
  const {jobs, errors} = parseJobs(text);
  const {batches, duplicates, filtered} = planJobs(jobs, options);
  return {accepted: jobs.length, errors, batches, duplicates, filtered};
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if ((flag !== '--batch-size' && flag !== '--max-attempts') ||
        Object.hasOwn(options, flag === '--batch-size' ? 'batchSize' : 'maxAttempts')) {
      throw new TypeError('invalid arguments');
    }
    const value = args[index + 1];
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new TypeError('invalid arguments');
    const number = Number(value);
    const key = flag === '--batch-size' ? 'batchSize' : 'maxAttempts';
    const maximum = key === 'batchSize' ? 50 : 100;
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new TypeError('invalid arguments');
    options[key] = number;
    index += 1;
  }
  return options;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { text += chunk; });
    process.stdin.once('end', () => resolve(text));
    process.stdin.once('error', reject);
  });
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
    const text = await readStdin();
    process.stdout.write(`${JSON.stringify(processText(text, options))}\n`);
  } catch {
    process.stderr.write('INTERNAL_ERROR\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
