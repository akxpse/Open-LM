export function planJobs(jobs, options = {}) {
  // Validate inputs
  if (!Array.isArray(jobs)) {
    throw new TypeError('jobs must be an array');
  }
  
  if (typeof options !== 'object' || Array.isArray(options) || options === null) {
    throw new TypeError('options must be a non-null object');
  }
  
  const { batchSize = 2, maxAttempts = 3 } = options;
  
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
    throw new TypeError('batchSize must be an integer between 1 and 50');
  }
  
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError('maxAttempts must be an integer between 1 and 100');
  }
  
  // Validate each job before processing
  for (const job of jobs) {
    if (typeof job !== 'object' || Array.isArray(job) || job === null) {
      throw new TypeError('All jobs must be objects');
    }
    
    const { id, tenant, priority, createdAt, attempts } = job;
    
    if (typeof id !== 'string' || !id.trim()) {
      throw new TypeError('Job id must be a non-empty string');
    }
    
    if (typeof tenant !== 'string' || !tenant.trim()) {
      throw new TypeError('Job tenant must be a non-empty string');
    }
    
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      throw new TypeError('Job priority must be an integer between 1 and 5');
    }
    
    if (!Number.isSafeInteger(createdAt) || createdAt < 0) {
      throw new TypeError('Job createdAt must be a non-negative safe integer');
    }
    
    if (!Number.isSafeInteger(attempts) || attempts < 0) {
      throw new TypeError('Job attempts must be a non-negative safe integer');
    }
  }
  
  // Create map to track latest job per tenant-id tuple
  const jobMap = new Map();
  
  for (const job of jobs) {
    const key = `${job.tenant}|${job.id}`;
    const existing = jobMap.get(key);
    
    if (!existing || job.createdAt > existing.createdAt) {
      jobMap.set(key, { ...job });
    } else if (job.createdAt === existing.createdAt && job.attempts < existing.attempts) {
      // In case of exact timestamp tie, keep the one with fewer attempts
      jobMap.set(key, { ...job });
    }
  }
  
  // Convert map values to array and filter out jobs that have reached maxAttempts
  const validJobs = Array.from(jobMap.values());
  const filteredJobs = validJobs.filter(job => job.attempts >= maxAttempts);
  const remainingJobs = validJobs.filter(job => job.attempts < maxAttempts);
  
  // Sort by tenant, then priority (desc), createdAt (asc), id (asc)
  remainingJobs.sort((a, b) => {
    if (a.tenant !== b.tenant) {
      return a.tenant.localeCompare(b.tenant); // This is UTF-16 lexicographic order
    }
    
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Descending priority
    }
    
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt; // Ascending timestamp
    }
    
    return a.id.localeCompare(b.id); // Ascending ID
  });
  
  // Group into batches per tenant
  const batches = [];
  const tenantBatches = new Map();
  
  for (const job of remainingJobs) {
    if (!tenantBatches.has(job.tenant)) {
      tenantBatches.set(job.tenant, []);
    }
    
    tenantBatches.get(job.tenant).push(job);
  }
  
  // Create batches for each tenant
  for (const [tenant, tenantJobs] of tenantBatches.entries()) {
    let batchNum = 1;
    let currentBatch = [];
    
    for (const job of tenantJobs) {
      if (currentBatch.length >= batchSize) {
        batches.push({
          tenant,
          batch: batchNum++,
          jobs: currentBatch.map(j => ({ ...j }))
        });
        currentBatch = [];
      }
      
      currentBatch.push(job);
    }
    
    // Add the last batch
    if (currentBatch.length > 0) {
      batches.push({
        tenant,
        batch: batchNum,
        jobs: currentBatch.map(j => ({ ...j }))
      });
    }
  }
  
  return {
    batches,
    duplicates: validJobs.length - remainingJobs.length,
    filtered: filteredJobs.length
  };
}