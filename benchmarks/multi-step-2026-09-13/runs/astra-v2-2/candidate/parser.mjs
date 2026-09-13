export function parseJobs(text) {
  if (typeof text !== 'string') throw new TypeError('Expected text');
  const jobs = [];
  const errors = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    let row;
    try {
      row = JSON.parse(lines[i]);
    } catch {
      errors.push({line: i + 1, code: 'INVALID_JSON'});
      continue;
    }
    if (row === null || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.id !== 'string' || row.id.trim() === '' ||
        typeof row.tenant !== 'string' || row.tenant.trim() === '' ||
        !Number.isInteger(row.priority) || row.priority < 1 || row.priority > 5 ||
        !Number.isSafeInteger(row.createdAt) || row.createdAt < 0 ||
        !Number.isSafeInteger(row.attempts) || row.attempts < 0) {
      errors.push({line: i + 1, code: 'INVALID_JOB'});
      continue;
    }
    jobs.push({id: row.id.trim(), tenant: row.tenant.trim(),
      priority: row.priority, createdAt: row.createdAt, attempts: row.attempts});
  }
  return {jobs, errors};
}
