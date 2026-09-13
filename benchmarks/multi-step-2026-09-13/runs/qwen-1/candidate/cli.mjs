import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';

export function processText(text, options = {}) {
  const { jobs, errors } = parseJobs(text);
  
  // Count valid jobs before deduplication and filtering
  const accepted = jobs.length;
  
  const { batches, duplicates, filtered } = planJobs(jobs, options);
  
  return {
    accepted,
    errors,
    batches,
    duplicates,
    filtered
  };
}

// CLI execution logic
if (import.meta.url === new URL('file://' + process.argv[1]).href) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let batchSize = 2;
  let maxAttempts = 3;
  
  try {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--batch-size') {
        if (i + 1 >= args.length) {
          throw new Error('Missing value for --batch-size');
        }
        
        const value = parseInt(args[i + 1], 10);
        if (isNaN(value) || !Number.isInteger(value) || value < 1 || value > 50) {
          throw new Error('Invalid batch size');
        }
        
        batchSize = value;
        i++;
      } else if (args[i] === '--max-attempts') {
        if (i + 1 >= args.length) {
          throw new Error('Missing value for --max-attempts');
        }
        
        const value = parseInt(args[i + 1], 10);
        if (isNaN(value) || !Number.isInteger(value) || value < 1 || value > 100) {
          throw new Error('Invalid max attempts');
        }
        
        maxAttempts = value;
        i++;
      } else {
        throw new Error(`Unknown argument: ${args[i]}`);
      }
    }
    
    // Read stdin
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const result = processText(input, { batchSize, maxAttempts });
        console.log(JSON.stringify(result));
        process.exit(0);
      } catch (error) {
        if (error.message.includes('INVALID_ARGUMENTS')) {
          console.error('INVALID_ARGUMENTS');
          process.exit(2);
        } else {
          console.error('INTERNAL_ERROR');
          process.exit(1);
        }
      }
    });
    
    process.stdin.on('error', () => {
      console.error('INTERNAL_ERROR');
      process.exit(1);
    });
    
    process.stdin.resume();
  } catch (error) {
    if (error.message.includes('INVALID_ARGUMENTS') || error.message.includes('Missing value')) {
      console.error('INVALID_ARGUMENTS');
      process.exit(2);
    } else {
      console.error('INTERNAL_ERROR');
      process.exit(1);
    }
  }
}