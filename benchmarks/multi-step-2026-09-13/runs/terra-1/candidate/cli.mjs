import { pathToFileURL } from 'node:url';
import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';
export function processText(text, options) {
  const { jobs, errors } = parseJobs(text);
  return { accepted: jobs.length, errors, ...planJobs(jobs, options) };
}
function parseArguments(args) {
  const options = {}, names = new Map([['--batch-size', 'batchSize'], ['--max-attempts', 'maxAttempts']]);
  for (let i = 0; i < args.length; i += 2) {
    const name = names.get(args[i]), raw = args[i + 1];
    if (!name || raw === undefined || Object.hasOwn(options, name) || !/^[0-9]+$/.test(raw)) throw new TypeError();
    const value = Number(raw); if (!Number.isSafeInteger(value)) throw new TypeError(); options[name] = value;
  }
  planJobs([], options); return options;
}
async function main() {
  let options;
  try { options = parseArguments(process.argv.slice(2)); } catch { process.stderr.write('INVALID_ARGUMENTS\n'); process.exitCode = 2; return; }
  try {
    let input = ''; process.stdin.setEncoding('utf8'); for await (const chunk of process.stdin) input += chunk;
    process.stdout.write(`${JSON.stringify(processText(input, options))}\n`);
  } catch { process.stderr.write('INTERNAL_ERROR\n'); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
