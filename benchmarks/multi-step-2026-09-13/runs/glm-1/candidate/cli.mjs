import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';
import { pathToFileURL } from 'url';

export function processText(text, options = {}) {
  const { accepted, errors } = parseJobs(text);
  const result = planJobs(accepted, options);
  return {
    accepted,
    errors,
    ...result
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--batch-size') {
      const value = args[++i];
      if (!/^\d+$/.test(value)) {
        console.error('INVALID_ARGUMENTS\n');
        process.exit(2);
      }
      options.batchSize = parseInt(value, 10);
    } else if (arg === '--max-attempts') {
      const value = args[++i];
      if (!/^\d+$/.test(value)) {
        console.error('INVALID_ARGUMENTS\n');
        process.exit(2);
      }
      options.maxAttempts = parseInt(value, 10);
    } else {
      console.error('INVALID_ARGUMENTS\n');
      process.exit(2);
    }
  }

  const stdin = require('fs').readFileSync(0, 'utf-8');
  const result = processText(stdin, options);
  console.log(JSON.stringify(result) + '\n');
  process.exit(0);
}