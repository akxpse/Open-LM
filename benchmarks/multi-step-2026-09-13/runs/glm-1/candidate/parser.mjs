export function parseJobs(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const lines = text.split(/\r?\n/);
  const jobs = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.trim() === '') {
      continue;
    }

    try {
      const row = JSON.parse(line);

      if (!Array.isArray(row) || typeof row !== 'object' || row === null) {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      const id = row.id;
      const tenant = row.tenant;
      const priority = row.priority;
      const createdAt = row.createdAt;
      const attempts = row.attempts;

      if (typeof id !== 'string' || id.trim() === '') {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      if (typeof tenant !== 'string' || tenant.trim() === '') {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 1 || priority > 5) {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      if (typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt < 0) {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      if (typeof attempts !== 'number' || !Number.isSafeInteger(attempts) || attempts < 0) {
        errors.push({ line: lineNum, code: 'INVALID_JOB' });
        continue;
      }

      jobs.push({
        id: id.trim(),
        tenant: tenant.trim(),
        priority,
        createdAt,
        attempts
      });
    } catch {
      errors.push({ line: lineNum, code: 'INVALID_JSON' });
    }
  }

  return { jobs, errors };
}