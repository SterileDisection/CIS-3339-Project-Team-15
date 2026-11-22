// This is the main file for the backend
//
// Sprint 3 changes:
// - configuration is read and checked in config/env.js; the server refuses to start with a
//   clear list of problems instead of failing later with a confusing error (D1/D2)
// - CORS only allows the origin(s) in CORS_ORIGIN instead of '*' (S1)
// - GET /health reports whether the app and the database are up (B2)
// - one error handler, registered after all routes, always answers { error } (B2).
//   The template registered its error handler after app.listen() and sent plain text.
// - the server starts listening right away and connects to MongoDB in the background, so
//   /health can report "disconnected" instead of the process just hanging
// - app is exported so it can be loaded without starting a server (scripts / tests)

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

// loads backend/.env and validates it
const { config, checkConfig } = require('./config/env');
const { notFoundRoute, errorHandler } = require('./middleware/errorHandler');

// creates a new instance of express application
const app = express();
app.disable('x-powered-by');

// S1: only the configured frontend origin(s) may call the API from a browser.
// Requests with no Origin header (curl, Postman, server-to-server) are not affected by CORS.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = config.corsOrigins.includes(origin.replace(/\/+$/, ''));
      // false = no CORS headers, so the browser blocks the response (instead of a 500 error)
      return callback(null, allowed);
    }
  })
);

// setup and access request body
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// routes
app.use('/health', require('./routes/health'));
app.use('/org', require('./routes/org'));
app.use('/users', require('./routes/users'));
app.use('/clients', require('./routes/clients'));
app.use('/events', require('./routes/events'));
app.use('/services', require('./routes/services'));

// B2: unknown routes -> 404, then every error -> { error: "..." }
app.use(notFoundRoute);
app.use(errorHandler);

function start() {
  const problems = checkConfig(config);
  if (problems.length) {
    console.error('The backend configuration in backend/.env is not valid:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }

  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
    console.log(`CORS allowed origin(s): ${config.corsOrigins.join(', ')}`);
  });

  mongoose
    .connect(config.mongoUrl, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('Database connection Success!'))
    // never print the connection string itself, it contains the database password
    .catch((err) => console.error('Mongo Connection Error:', err.message));
}

// only start the server when run directly (npm start), not when another file requires app.js
if (require.main === module) {
  start();
}

module.exports = app;
