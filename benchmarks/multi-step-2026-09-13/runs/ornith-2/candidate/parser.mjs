export function parseJobs(text) {
	if (typeof text !== 'string') throw new TypeError('text must be a string');

	const lines = text.split(/\r?\n/);
	const jobs = [];
	const errors = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^\s*$/.test(line)) continue;

		const lineNum = i + 1;

		let parsed;
		try {
			parsed = JSON.parse(line);
		} catch (_e) {
			errors.push({ line: lineNum, code: 'INVALID_JSON' });
			continue;
		}

		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		const id = parsed.id;
		const tenant = parsed.tenant;
		const priority = parsed.priority;
		const createdAt = parsed.createdAt;
		const attempts = parsed.attempts;

		if (typeof id !== 'string' || typeof tenant !== 'string') {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		const trimmedId = id.trim();
		const trimmedTenant = tenant.trim();

		if (trimmedId === '' || trimmedTenant === '') {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		if (typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt < 0) {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		if (typeof attempts !== 'number' || !Number.isSafeInteger(attempts) || attempts < 0) {
			errors.push({ line: lineNum, code: 'INVALID_JOB' });
			continue;
		}

		jobs.push({ id: trimmedId, tenant: trimmedTenant, priority, createdAt, attempts });
	}

	return { jobs, errors };
}
