import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';

export function processText(text, options = {}) {
  const parsed = parseJobs(text);
  
  // CLI defaults match planner defaults
  const cliOptions = { batchSize: 2, maxAttempts: 3, ...options };
  
  // Validate CLI options (same as planner validation)
  if (cliOptions.batchSize < 1 || cliOptions.batchSize > 50) {
    throw new TypeError();
  }
  
  if (cliOptions.maxAttempts < 1 || cliOptions.maxAttempts > 100) {
    throw new TypeError();
  }

  const planned = planJobs(parsed.jobs, cliOptions);
  
  return {
    accepted: parsed.jobs.length,
    errors: parsed.errors,
    batches: planned.batches,
    duplicates: planned.duplicates,
    filtered: planned.filtered
  };
}
