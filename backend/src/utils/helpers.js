/**
 * Shared small helpers: async handler wrapper, http errors, request id.
 */

/** Wraps an async route handler so rejections reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Simple API error with status. */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const notFound = (req, res) =>
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });

const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate value — record already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid input format' });
  }
  console.error('[api] Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
};

module.exports = { asyncHandler, AppError, notFound, errorHandler };