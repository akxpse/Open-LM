export function planJobs(jobs, options = {}) {
  if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const { batchSize = 2, maxAttempts = 3 } = options;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) throw new TypeError('invalid options');
  for (const job of jobs) if (!isNormalizedJob(job)) throw new TypeError('invalid job');
  const byTenant = new Map(); let duplicates = 0;
  for (const job of jobs) {
    let ids = byTenant.get(job.tenant);
    if (!ids) byTenant.set(job.tenant, ids = new Map());
    const previous = ids.get(job.id);
    if (previous !== undefined) { duplicates += 1; if (job.createdAt >= previous.createdAt) ids.set(job.id, job); }
    else ids.set(job.id, job);
  }
  let filtered = 0; const batches = [];
  for (const tenant of [...byTenant.keys()].sort(compare)) {
    const eligible = [...byTenant.get(tenant).values()].filter(job => {
      if (job.attempts >= maxAttempts) { filtered += 1; return false; } return true;
    }).sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt || compare(a.id, b.id));
    for (let start = 0, batch = 1; start < eligible.length; start += batchSize, batch += 1) batches.push({ tenant, batch, jobs: eligible.slice(start, start + batchSize).map(copy) });
  }
  return { batches, duplicates, filtered };
}
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function copy(job) { return { id: job.id, tenant: job.tenant, priority: job.priority, createdAt: job.createdAt, attempts: job.attempts }; }
function isNormalizedJob(job) {
  return job !== null && typeof job === 'object' && !Array.isArray(job) && Object.keys(job).length === 5 &&
    Object.hasOwn(job, 'id') && Object.hasOwn(job, 'tenant') && Object.hasOwn(job, 'priority') && Object.hasOwn(job, 'createdAt') && Object.hasOwn(job, 'attempts') &&
    typeof job.id === 'string' && job.id !== '' && job.id.trim() === job.id && typeof job.tenant === 'string' && job.tenant !== '' && job.tenant.trim() === job.tenant &&
    Number.isInteger(job.priority) && job.priority >= 1 && job.priority <= 5 && Number.isSafeInteger(job.createdAt) && job.createdAt >= 0 && Number.isSafeInteger(job.attempts) && job.attempts >= 0;
}
