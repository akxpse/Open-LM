export function planJobs(jobs, options = {}) {
	if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');

	if (options === null || typeof options !== 'object' || Array.isArray(options)) {
		throw new TypeError('options must be a non-null, non-array object');
	}
	const opts = Object.assign({}, options);

	let batchSize = 2;
	let maxAttempts = 3;

	if ('batchSize' in opts) {
		const v = opts.batchSize;
		if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 50) {
			throw new TypeError('batchSize must be integer 1..50');
		}
		batchSize = v;
	}

	if ('maxAttempts' in opts) {
		const v = opts.maxAttempts;
		if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 100) {
			throw new TypeError('maxAttempts must be integer 1..100');
		}
		maxAttempts = v;
	}

	const requiredKeys = ['id', 'tenant', 'priority', 'createdAt', 'attempts'];
	for (const j of jobs) {
		if (!j || typeof j !== 'object' || Array.isArray(j)) throw new TypeError('each job must be a plain object');
		const keys = Reflect.ownKeys(j);
		if (keys.length !== 5) throw new TypeError('job must have exactly five fields');
		for (const k of requiredKeys) {
			if (!keys.includes(k)) throw new TypeError('missing required field: ' + k);
		}
		if (typeof j.id !== 'string' || typeof j.tenant !== 'string') throw new TypeError('job id/tenant must be strings');
		if (j.id.trim() === '' || j.tenant.trim() === '') throw new TypeError('job id/tenant must be non-empty after trim');
		if (j.id !== j.id.trim() || j.tenant !== j.tenant.trim()) throw new TypeError('job id/tenant must already be trimmed');
		if (!Number.isInteger(j.priority) || j.priority < 1 || j.priority > 5) throw new TypeError('job priority out of range');
		if (typeof j.createdAt !== 'number' || !Number.isSafeInteger(j.createdAt) || j.createdAt < 0) throw new TypeError('createdAt must be nonnegative safe integer');
		if (typeof j.attempts !== 'number' || !Number.isSafeInteger(j.attempts) || j.attempts < 0) throw new TypeError('attempts must be nonnegative safe integer');
	}

	const result = { batches: [], duplicates: 0, filtered: 0 };

	if (jobs.length === 0) return result;

	const tenantMap = new Map();

	for (const j of jobs) {
		let bucket = tenantMap.get(j.tenant);
		if (!bucket) {
			bucket = new Map();
			tenantMap.set(j.tenant, bucket);
		}
		const existing = bucket.get(j.id);
		if (existing !== undefined) {
			result.duplicates++;
			if (j.createdAt >= existing.createdAt) {
				bucket.set(j.id, j);
			}
		} else {
			bucket.set(j.id, j);
		}
	}

	for (const [tenant, idMap] of tenantMap) {
		const winners = Array.from(idMap.values());

		const kept = [];
		let filteredCount = 0;
		for (const w of winners) {
			if (w.attempts >= maxAttempts) {
				filteredCount++;
			} else {
				kept.push(w);
			}
		}
		result.filtered += filteredCount;

		kept.sort((a, b) => {
			if (b.priority !== a.priority) return b.priority - a.priority;
			if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		});

		const chunks = [];
		for (let i = 0; i < kept.length; i += batchSize) {
			chunks.push(kept.slice(i, i + batchSize));
		}

		let batchNum = 0;
		for (const chunk of chunks) {
			batchNum++;
			result.batches.push({
				tenant: tenant,
				batch: batchNum,
				jobs: chunk.map((j) => Object.assign({}, j)),
			});
		}
	}

	result.batches.sort((a, b) => {
		if (a.tenant < b.tenant) return -1;
		if (a.tenant > b.tenant) return 1;
		return a.batch - b.batch;
	});

	return result;
}
