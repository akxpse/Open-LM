export function parseJobs(text) {
  if (typeof text !== 'string') throw new TypeError();

  const lines = text.split(/\r?\n/);
  const jobs = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const obj = JSON.parse(line);
      
      // Validate required fields and discard unknown ones
      if (!(obj.id && obj.tenant)) {
        errors.push({ line: i + 1, code: 'INVALID_JOB' });
        continue;
      }

      // Trim strings and validate types
      const job = {
        id: String(obj.id).trim(),
        tenant: String(obj.tenant).trim(),
        priority: Number(obj.priority),
        createdAt: BigInt(obj.createdAt),
        attempts: BigInt(obj.attempts)
      };

      // Check field constraints
      if (job.priority < 1 || job.priority > 5) {
        errors.push({ line: i + 1, code: 'INVALID_JOB' });
        continue;
      }

      if (job.createdAt < 0 || !Number.isSafeInteger(job.createdAt)) {
        errors.push({ line: i + 1, code: 'INVALID_JOB' });
        continue;
      }

      if (job.attempts < 0 || !Number.isSafeInteger(job.attempts)) {
        errors.push({ line: i + 1, code: 'INVALID_JOB' });
        continue;
      }

      jobs.push(job);
    } catch (e) {
      errors.push({ line: i + 1, code: 'INVALID_JSON' });
    }
  }

  return { jobs, errors };
}
