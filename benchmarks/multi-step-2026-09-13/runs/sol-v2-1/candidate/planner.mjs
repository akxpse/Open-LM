function isNormalizedJob(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id === value.id.trim() &&
    typeof value.tenant === 'string' &&
    value.tenant.length > 0 &&
    value.tenant === value.tenant.trim() &&
    Number.isInteger(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 5 &&
    Number.isSafeInteger(value.createdAt) &&
    value.createdAt >= 0 &&
    Number.isSafeInteger(value.attempts) &&
    value.attempts >= 0;
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function planJobs(jobs, {batchSize = 2, maxAttempts = 3} = {}) {
  if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');

  const options = arguments.length >= 2 ? arguments[1] : {};
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('invalid options');
  }

  for (const job of jobs) {
    if (!isNormalizedJob(job)) throw new TypeError('invalid job');
  }

  const winners = new Map();
  let duplicates = 0;
  for (const job of jobs) {
    let tenantJobs = winners.get(job.tenant);
    if (tenantJobs === undefined) {
      tenantJobs = new Map();
      winners.set(job.tenant, tenantJobs);
    }

    const previous = tenantJobs.get(job.id);
    if (previous === undefined) {
      tenantJobs.set(job.id, job);
    } else {
      duplicates += 1;
      if (job.createdAt >= previous.createdAt) tenantJobs.set(job.id, job);
    }
  }

  const batches = [];
  let filtered = 0;
  const tenants = [...winners.keys()].sort(compareStrings);
  for (const tenant of tenants) {
    const eligible = [];
    for (const job of winners.get(tenant).values()) {
      if (job.attempts >= maxAttempts) filtered += 1;
      else eligible.push(job);
    }
    eligible.sort((left, right) =>
      right.priority - left.priority ||
      left.createdAt - right.createdAt ||
      compareStrings(left.id, right.id));

    for (let offset = 0; offset < eligible.length; offset += batchSize) {
      batches.push({
        tenant,
        batch: offset / batchSize + 1,
        jobs: eligible.slice(offset, offset + batchSize).map(job => ({...job})),
      });
    }
  }

  return {batches, duplicates, filtered};
}
