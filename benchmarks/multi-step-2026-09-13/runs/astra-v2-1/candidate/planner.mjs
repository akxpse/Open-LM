const fields = ['id', 'tenant', 'priority', 'createdAt', 'attempts'];
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function isNormalized(job) {
  return job !== null && typeof job === 'object' && !Array.isArray(job) &&
    Reflect.ownKeys(job).length === fields.length &&
    fields.every(field => Object.hasOwn(job, field)) &&
    typeof job.id === 'string' && job.id !== '' && job.id === job.id.trim() &&
    typeof job.tenant === 'string' && job.tenant !== '' && job.tenant === job.tenant.trim() &&
    Number.isInteger(job.priority) && job.priority >= 1 && job.priority <= 5 &&
    Number.isSafeInteger(job.createdAt) && job.createdAt >= 0 &&
    Number.isSafeInteger(job.attempts) && job.attempts >= 0;
}

export function planJobs(jobs, options = {}) {
  if (!Array.isArray(jobs)) throw new TypeError('Expected jobs array');
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Expected options object');
  }
  const {batchSize = 2, maxAttempts = 3} = options;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('Invalid options');
  }
  for (const job of jobs) {
    if (!isNormalized(job)) throw new TypeError('Invalid normalized job');
  }

  const tenants = new Map();
  let duplicates = 0;
  let filtered = 0;
  for (const job of jobs) {
    if (!tenants.has(job.tenant)) tenants.set(job.tenant, new Map());
    const byId = tenants.get(job.tenant);
    const previous = byId.get(job.id);
    if (previous !== undefined) duplicates++;
    if (previous === undefined || job.createdAt >= previous.createdAt) {
      byId.set(job.id, job);
    }
  }

  const batches = [];
  for (const tenant of [...tenants.keys()].sort(compareText)) {
    const selected = [];
    for (const job of tenants.get(tenant).values()) {
      if (job.attempts >= maxAttempts) filtered++;
      else selected.push({id: job.id, tenant: job.tenant, priority: job.priority,
        createdAt: job.createdAt, attempts: job.attempts});
    }
    selected.sort((a, b) => b.priority - a.priority ||
      a.createdAt - b.createdAt || compareText(a.id, b.id));
    for (let i = 0; i < selected.length; i += batchSize) {
      batches.push({tenant, batch: i / batchSize + 1, jobs: selected.slice(i, i + batchSize)});
    }
  }
  return {batches, duplicates, filtered};
}
