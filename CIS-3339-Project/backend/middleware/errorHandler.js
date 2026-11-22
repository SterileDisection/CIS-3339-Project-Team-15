// Sprint 3 (B2): centralized error handling.
//
// Registered in app.js AFTER all routes. Every error ends up here and the response is always
//   { "error": "Human readable message" }
// Stack traces, raw Mongo errors and secrets are only written to the server log, never sent.

const { HttpError } = require('../utils/http');

// Any request that didn't match a route
function notFoundRoute(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}

// Turns any error into a status code and a short, safe message
function describeError(err) {
  if (err instanceof HttpError) {
    return { status: err.status, message: err.message };
  }
  // Mongoose schema validation, e.g. a required field is missing
  if (err.name === 'ValidationError' && err.errors) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return { status: 400, message: message || 'Some fields are not valid' };
  }
  // a value that can't be converted to the schema type, e.g. "abc" for an ObjectId or a date
  if (err.name === 'CastError') {
    return { status: 400, message: `Invalid value for ${err.path}` };
  }
  // express.json() could not parse the request body
  if (err.type === 'entity.parse.failed') {
    return { status: 400, message: 'Request body is not valid JSON' };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'Request body is too large' };
  }
  // unique index violation
  if (err.code === 11000) {
    return { status: 409, message: 'A record with the same value already exists' };
  }
  // anything else is unexpected: hide the details
  return { status: 500, message: 'Something went wrong on the server' };
}

// Express knows this is an error handler because it takes 4 arguments
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const { status, message } = describeError(err);
  if (status >= 500) {
    // full details stay on the server for debugging
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }
  return res.status(status).json({ error: message });
}

module.exports = { notFoundRoute, errorHandler, describeError };
