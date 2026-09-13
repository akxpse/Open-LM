export function planJobs(jobs, options = {}) {
  if (!Array.isArray(jobs)) {
    throw new TypeError('jobs must be an array');
  }

  if (options === null || Array.isArray(options) || typeof options !== 'object') {
    throw new TypeError('options must be a non-null, non-array object');
  }

  const { batchSize = 2, maxAttempts = 3 } = options;

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
    throw new TypeError('batchSize must be an integer between 1 and 50');
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('maxAttempts must be an integer between 1 and 100');
  }

  const tenantMap = new Map();

  for (const job of jobs) {
    if (!Array.isArray(job) || typeof job !== 'object' || job === null) {
      throw new TypeError('each job must be a non-array object');
    }

    if (typeof job.id !== 'string' || job.id.trim() === '') {
      throw new TypeError('job.id must be a non-empty string');
    }

    if (typeof job.tenant !== 'string' || job.tenant.trim() === '') {
      throw new TypeError('job.tenant must be a non-empty string');
    }

    if (typeof job.priority !== 'number' || !Number.isInteger(job.priority) || job.priority < 1 || job.priority > 5) {
      throw new TypeError('job.priority must be an integer between 1 and 5');
    }

    if (typeof job.createdAt !== 'number' || !Number.isSafeInteger(job.createdAt) || job.createdAt < 0) {
      throw new TypeError('job.createdAt must be a non-negative safe integer');
    }

    if (typeof job.attempts !== 'number' || !Number.isSafeInteger(job.attempts) || job.attempts < 0) {
      throw new TypeError('job.attempts must be a non-negative safe integer');
    }

    const tenant = job.tenant.trim();
    const id = job.id.trim();

    if (!tenantMap.has(tenant)) {
      tenantMap.set(tenant, new Map());
    }

    const idMap = tenantMap.get(tenant);

    if (!idMap.has(id)) {
      idMap.set(id, { ...job });
    } else {
      const existing = idMap.get(id);
      if (job.createdAt > existing.createdAt) {
        idMap.set(id, { ...job });
      }
    }
  }

  const batches = [];
  let duplicates = 0;
  let filtered = 0;

  for (const [tenant, idMap] of tenantMap) {
    const sortedJobs = Array.from(idMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.id.localeCompare(b.id);
    });

    const filteredJobs = sortedJobs.filter(job => job.attempts < maxAttempts);
    filtered += sortedJobs.length - filteredJobs.length;

    let batchNum = 1;
    for (let i = 0; i < filteredJobs.length; i += batchSize) {
      const chunk = filteredJobs.slice(i, i + batchSize);
      batches.push({
        tenant,
        batch: batchNum,
        jobs: chunk.map(job => ({ ...job }))
      });
      batchNum++;
    }
  }

  duplicates = jobs.length - batches.reduce((sum, batch) => sum + batch.jobs.length, 0);

  return { batches, duplicates, filtered };
}