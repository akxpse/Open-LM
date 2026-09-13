import { parseJobs } from './parser.mjs';
import { planJobs } from './planner.mjs';
import { pathToFileURL } from 'node:url';

export function processText(text, options = {}) {
	const parsed = parseJobs(text);
	const plannerResult = planJobs(parsed.jobs, options);
	return {
		accepted: parsed.jobs.length,
		errors: parsed.errors,
		batches: plannerResult.batches,
		duplicates: plannerResult.duplicates,
		filtered: plannerResult.filtered,
	};
}

function failArg() {
	process.stderr.write('INVALID_ARGUMENTS\n');
	process.exit(2);
}

function failInternal() {
	process.stderr.write('INTERNAL_ERROR\n');
	process.exit(1);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	let batchSize = 2;
	let maxAttempts = 3;
	let seenBatchSize = false;
	let seenMaxAttempts = false;

	let i = 0;
	while (i < args.length) {
		const arg = args[i];
		if (arg === '--batch-size') {
			if (seenBatchSize) failArg();
			seenBatchSize = true;
			i++;
			if (i >= args.length) failArg();
			const v = args[i];
			if (!/^[0-9]+$/.test(v)) failArg();
			const n = Number(v);
			if (n < 1 || n > 50) failArg();
			batchSize = n;
		} else if (arg === '--max-attempts') {
			if (seenMaxAttempts) failArg();
			seenMaxAttempts = true;
			i++;
			if (i >= args.length) failArg();
			const v = args[i];
			if (!/^[0-9]+$/.test(v)) failArg();
			const n = Number(v);
			if (n < 1 || n > 100) failArg();
			maxAttempts = n;
		} else {
			failArg();
		}
		i++;
	}

	return { batchSize, maxAttempts };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	try {
		const opts = parseArgs(process.argv);
		let data = '';
		process.stdin.setEncoding('utf8');
		const stdoutErr = () => failInternal();
		process.stdout.on('error', stdoutErr);
		new Promise((resolve, reject) => {
			process.stdin.on('data', (chunk) => { data += chunk; });
			process.stdin.on('end', resolve);
			process.stdin.on('error', reject);
		}).then(() => {
			try {
				const result = processText(data, opts);
				process.stdout.write(JSON.stringify(result) + '\n');
			} catch (_e) {
				failInternal();
			}
		}, () => failInternal());
	} catch (_e) {
		failArg();
	}
}
