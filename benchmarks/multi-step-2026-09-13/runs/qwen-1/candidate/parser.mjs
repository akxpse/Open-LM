export function parseJobs(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }

  const jobs = [];
  const errors = [];
  
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty or whitespace-only lines
    if (!line.trim()) {
      continue;
    }
    
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      errors.push({ line: i + 1, code: 'INVALID_JSON' });
      continue;
    }
    
    // Validate job schema - handle null case
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    const { id, tenant, priority, createdAt, attempts } = parsed;
    
    // Check required fields and types
    if (typeof id !== 'string' || !id.trim()) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    if (typeof tenant !== 'string' || !tenant.trim()) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    if (!Number.isSafeInteger(createdAt) || createdAt < 0) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    if (!Number.isSafeInteger(attempts) || attempts < 0) {
      errors.push({ line: i + 1, code: 'INVALID_JOB' });
      continue;
    }
    
    // If we get here, the job is valid
    jobs.push({
      id: id.trim(),
      tenant: tenant.trim(),
      priority,
      createdAt,
      attempts
    });
  }
  
  return { jobs, errors };
}