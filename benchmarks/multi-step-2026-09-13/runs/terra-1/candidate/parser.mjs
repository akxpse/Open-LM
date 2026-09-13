export function parseJobs(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  const jobs = [], errors = [];
  for (const [index, line] of text.split('\n').entries()) {
    if (line.trim() === '') continue;
    let value;
    try { value = JSON.parse(line); } catch { errors.push({ line: index + 1, code: 'INVALID_JSON' }); continue; }
    if (!isJob(value)) { errors.push({ line: index + 1, code: 'INVALID_JOB' }); continue; }
    jobs.push({ id: value.id.trim(), tenant: value.tenant.trim(), priority: value.priority, createdAt: value.createdAt, attempts: value.attempts });
  }
  return { jobs, errors };
}
function isJob(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    typeof value.id === 'string' && value.id.trim() !== '' && typeof value.tenant === 'string' && value.tenant.trim() !== '' &&
    Number.isInteger(value.priority) && value.priority >= 1 && value.priority <= 5 &&
    Number.isSafeInteger(value.createdAt) && value.createdAt >= 0 && Number.isSafeInteger(value.attempts) && value.attempts >= 0;
}
