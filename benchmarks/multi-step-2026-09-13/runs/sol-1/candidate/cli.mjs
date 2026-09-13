import { pathToFileURL } from 'node:url';
import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';

export function processText(text, options) {
  const { jobs, errors } = parseJobs(text);
  const { batches, duplicates, filtered } = planJobs(jobs, options);
  return { accepted: jobs.length, errors, batches, duplicates, filtered };
}

function parseArguments(args) {
  const options = {};
  const names = new Map([['--batch-size', 'batchSize'], ['--max-attempts', 'maxAttempts']]);
  if (args.length % 2 !== 0) return null;
  for (let index = 0; index < args.length; index += 2) {
    const key = names.get(args[index]);
    const value = args[index + 1];
    if (key === undefined || Object.hasOwn(options, key) || !/^\d+$/.test(value)) return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number)) return null;
    options[key] = number;
  }
  if ((options.batchSize !== undefined && (options.batchSize < 1 || options.batchSize > 50))
    || (options.maxAttempts !== undefined && (options.maxAttempts < 1 || options.maxAttempts > 100))) return null;
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options === null) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
