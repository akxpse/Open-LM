import {pathToFileURL} from 'node:url';
import {parseJobs} from './parser.mjs';
import {planJobs} from './planner.mjs';

export function processText(text, options) {
  const {jobs, errors} = parseJobs(text);
  return {accepted: jobs.length, errors, ...planJobs(jobs, options)};
}

function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    let key;
    let limit;
    if (flag === '--batch-size') {
      key = 'batchSize';
      limit = 50;
    } else if (flag === '--max-attempts') {
      key = 'maxAttempts';
      limit = 100;
    } else {
      throw new TypeError('Invalid flag');
    }
    const raw = args[i + 1];
    if (Object.hasOwn(options, key) || typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) {
      throw new TypeError('Invalid argument');
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > limit) {
      throw new TypeError('Invalid argument range');
    }
    options[key] = value;
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
    process.stdin.setEncoding('utf8');
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    const output = JSON.stringify(processText(text, options)) + '\n';
    process.stdout.write(output);
    process.exitCode = 0;
  } catch {
    process.stderr.write('INTERNAL_ERROR\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
