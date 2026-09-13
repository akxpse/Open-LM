export function planJobs(jobs, options = {}) {
  if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const {batchSize = 2, maxAttempts = 3} = options;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('invalid options');
  }
  for (const job of jobs) validateJob(job);

  const tenants = new Map();
  let duplicates = 0;
  for (const job of jobs) {
    let ids = tenants.get(job.tenant);
    if (ids === undefined) {
      ids = new Map();
      tenants.set(job.tenant, ids);
    }
    const previous = ids.get(job.id);
    if (previous !== undefined) {
      duplicates += 1;
      if (job.createdAt >= previous.createdAt) ids.set(job.id, job);
    } else {
      ids.set(job.id, job);
    }
  }

  let filtered = 0;
  const batches = [];
  for (const tenant of [...tenants.keys()].sort(utf16Compare)) {
    const selected = [...tenants.get(tenant).values()].filter(job => {
      if (job.attempts >= maxAttempts) {
        filtered += 1;
        return false;
      }
      return true;
    }).sort((left, right) =>
      right.priority - left.priority || left.createdAt - right.createdAt || utf16Compare(left.id, right.id));
    for (let start = 0, batch = 1; start < selected.length; start += batchSize, batch += 1) {
      batches.push({tenant, batch, jobs: selected.slice(start, start + batchSize).map(copyJob)});
    }
  }
  return {batches, duplicates, filtered};
}

function validateJob(job) {
  if (job === null || typeof job !== 'object' || Array.isArray(job) ||
      !hasExactJobKeys(job) ||
      typeof job.id !== 'string' || job.id === '' || job.id.trim() !== job.id ||
      typeof job.tenant !== 'string' || job.tenant === '' || job.tenant.trim() !== job.tenant ||
      !Number.isInteger(job.priority) || job.priority < 1 || job.priority > 5 ||
      !Number.isSafeInteger(job.createdAt) || job.createdAt < 0 ||
      !Number.isSafeInteger(job.attempts) || job.attempts < 0) {
    throw new TypeError('invalid job');
  }
}

function hasExactJobKeys(job) {
  const keys = Object.keys(job);
  return keys.length === 5 &&
    keys.includes('id') && keys.includes('tenant') && keys.includes('priority') &&
    keys.includes('createdAt') && keys.includes('attempts');
}

function copyJob({id, tenant, priority, createdAt, attempts}) {
  return {id, tenant, priority, createdAt, attempts};
}

function utf16Compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
