function validJob(job) {
  return job !== null && typeof job === 'object' && !Array.isArray(job)
    && typeof job.id === 'string' && job.id.length > 0 && job.id === job.id.trim()
    && typeof job.tenant === 'string' && job.tenant.length > 0 && job.tenant === job.tenant.trim()
    && Number.isInteger(job.priority) && job.priority >= 1 && job.priority <= 5
    && Number.isSafeInteger(job.createdAt) && job.createdAt >= 0
    && Number.isSafeInteger(job.attempts) && job.attempts >= 0;
}
const compareStrings = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const copyJob = job => ({ id: job.id, tenant: job.tenant, priority: job.priority,
  createdAt: job.createdAt, attempts: job.attempts });

export function planJobs(jobs, options = {}) {
  if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const { batchSize = 2, maxAttempts = 3 } = options;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50
    || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('invalid options');
  }
  for (const job of jobs) if (!validJob(job)) throw new TypeError('invalid job');

  const byTenant = new Map();
  let duplicates = 0;
  for (const job of jobs) {
    let byId = byTenant.get(job.tenant);
    if (byId === undefined) { byId = new Map(); byTenant.set(job.tenant, byId); }
    const previous = byId.get(job.id);
    if (previous === undefined) byId.set(job.id, job);
    else {
      duplicates += 1;
      if (job.createdAt >= previous.createdAt) byId.set(job.id, job);
    }
  }

  let filtered = 0;
  const batches = [];
  for (const tenant of [...byTenant.keys()].sort(compareStrings)) {
    const eligible = [];
    for (const job of byTenant.get(tenant).values()) {
      if (job.attempts >= maxAttempts) filtered += 1;
      else eligible.push(job);
    }
    eligible.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt
      || compareStrings(a.id, b.id));
    for (let offset = 0; offset < eligible.length; offset += batchSize) {
      batches.push({ tenant, batch: offset / batchSize + 1,
        jobs: eligible.slice(offset, offset + batchSize).map(copyJob) });
    }
  }
  return { batches, duplicates, filtered };
}
