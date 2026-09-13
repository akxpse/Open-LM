function isValidJob(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.tenant === 'string' &&
    value.tenant.trim().length > 0 &&
    Number.isInteger(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 5 &&
    Number.isSafeInteger(value.createdAt) &&
    value.createdAt >= 0 &&
    Number.isSafeInteger(value.attempts) &&
    value.attempts >= 0;
}

export function parseJobs(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');

  const jobs = [];
  const errors = [];
  const lines = text.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) continue;

    let value;
    try {
      value = JSON.parse(line);
    } catch {
      errors.push({line: index + 1, code: 'INVALID_JSON'});
      continue;
    }

    if (!isValidJob(value)) {
      errors.push({line: index + 1, code: 'INVALID_JOB'});
      continue;
    }

    jobs.push({
      id: value.id.trim(),
      tenant: value.tenant.trim(),
      priority: value.priority,
      createdAt: value.createdAt,
      attempts: value.attempts,
    });
  }

  return {jobs, errors};
}
