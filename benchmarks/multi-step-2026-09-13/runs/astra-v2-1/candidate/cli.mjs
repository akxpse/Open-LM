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
    const key = flag === '--batch-size' ? 'batchSize' :
      flag === '--max-attempts' ? 'maxAttempts' : null;
    if (key === null || Object.hasOwn(options, key)) return null;
    const raw = args[i + 1];
    if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > (key === 'batchSize' ? 50 : 100)) {
      return null;
    }
    options[key] = value;
  }
  return options;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options === null) {
      process.stderr.write('INVALID_ARGUMENTS\n');
      process.exitCode = 2;
      return;
    }
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
