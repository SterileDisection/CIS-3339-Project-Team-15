// Sprint 3 (B2): small helpers shared by every route file.

const mongoose = require('mongoose');

// An error that already knows its HTTP status and the message the user should see.
// Throw it from any route (inside asyncHandler) and the central error handler sends
// { error: message } with that status.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// Express 4 does not catch errors thrown by async functions. Wrapping a handler with
// asyncHandler() passes any thrown error (or rejected promise) on to the error handler.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// True only for real 24 character hex ObjectIds. Lets routes answer 404 for a bad id
// instead of letting Mongoose throw a CastError.
function isValidId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id) && mongoose.isValidObjectId(id);
}

// User input inside a RegExp has to be escaped, otherwise a search for "(" crashes the query
// and a crafted pattern could make the database do a lot of work.
function escapeRegex(text) {
  return String(text == null ? '' : text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Copies only the allowed keys from a request body, so a client can't set fields such as
// _id or orgId that only the server is allowed to set.
function pickFields(body, allowed) {
  const result = {};
  if (!body || typeof body !== 'object') return result;
  for (const key of allowed) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

module.exports = { HttpError, asyncHandler, isValidId, escapeRegex, pickFields };
