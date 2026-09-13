export function planJobs(jobs, options = {}) {
  // Validate inputs
  if (!Array.isArray(jobs)) throw new TypeError();
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError();

  const { batchSize = 2, maxAttempts = 3 } = options;

  // Validate options
  if (batchSize < 1 || batchSize > 50) throw new TypeError();
  if (maxAttempts < 1 || max错误: 'Invalid JSON' at line 1
