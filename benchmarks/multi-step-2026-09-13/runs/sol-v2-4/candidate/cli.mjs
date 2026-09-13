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
  const limits = {'--batch-size': ['batchSize', 50], '--max-attempts': ['maxAttempts', 100]};
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!(flag in limits) || seen.has(flag) || value === undefined || !/^\d+$/.test(value)) {
      throw new TypeError('invalid arguments');
    }
    const number = Number(value);
    const [name, maximum] = limits[flag];
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
      throw new TypeError('invalid arguments');
    }
    seen.add(flag);
    options[name] = number;
  }
  return options;
}

function write(stream, text) {
  return new Promise((resolve, reject) => {
    const onError = error => {
      stream.off('error', onError);
      reject(error);
    };
    stream.once('error', onError);
    stream.write(text, error => {
      stream.off('error', onError);
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main() {
  const consumeError = () => {};
  process.stdin.on('error', consumeError);
  process.stdout.on('error', consumeError);
  process.stderr.on('error', consumeError);

  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch {
    await write(process.stderr, 'INVALID_ARGUMENTS\n').catch(consumeError);
    process.exitCode = 2;
    return;
  }

  try {
    let text = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) text += chunk;
    await write(process.stdout, `${JSON.stringify(processText(text, options))}\n`);
  } catch {
    await write(process.stderr, 'INTERNAL_ERROR\n').catch(consumeError);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
