// Sprint 3: one place that reads and checks the backend configuration.
// app.js and scripts/db-init.js both use it, so they always agree on what a valid setup is.

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load backend/.env no matter which folder the command is started from
// (path.join keeps this working on Windows, macOS and Linux).
// .env is NOT in the repository (it holds secrets and the repo is public): it comes from
// Canvas / the team, or is created from .env.example. Hosting services set the variables
// directly instead, so a missing file is only a problem when the variables are missing too.
const ENV_PATH = path.join(__dirname, '..', '.env');
const envFileFound = fs.existsSync(ENV_PATH);
require('dotenv').config({ path: ENV_PATH });

// CORS_ORIGIN can hold one origin, or a comma separated list if you deploy the frontend
// somewhere else as well. Trailing slashes are removed because browsers never send them.
function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const config = {
  mongoUrl: process.env.MONGO_URL,
  port: Number(process.env.PORT) || 3000,
  orgId: process.env.ORG_ID,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  seed: {
    orgName: process.env.SEED_ORG_NAME || 'Community Health Center',
    viewerUsername: process.env.SEED_VIEWER_USERNAME,
    viewerPassword: process.env.SEED_VIEWER_PASSWORD,
    editorUsername: process.env.SEED_EDITOR_USERNAME,
    editorPassword: process.env.SEED_EDITOR_PASSWORD
  }
};

// Returns a list of human readable problems. An empty list means the configuration is usable.
function checkConfig(cfg, { needSeed = false } = {}) {
  const problems = [];
  if (!envFileFound && !cfg.mongoUrl) {
    problems.push(
      'backend/.env was not found. Save the .env file from Canvas as backend/.env, ' +
        'or copy backend/.env.example to backend/.env and fill it in'
    );
  }
  if (!cfg.mongoUrl) problems.push('MONGO_URL is missing');
  else if (cfg.mongoUrl.includes('<')) problems.push('MONGO_URL still has a <placeholder> from .env.example');
  else if (!/^mongodb(\+srv)?:\/\//.test(cfg.mongoUrl)) {
    problems.push('MONGO_URL must start with mongodb:// or mongodb+srv://');
  }
  if (!cfg.orgId) problems.push('ORG_ID is missing');
  else if (!mongoose.isValidObjectId(cfg.orgId) || !/^[a-f0-9]{24}$/i.test(cfg.orgId)) {
    problems.push('ORG_ID must be a 24 character hex MongoDB ObjectId');
  }
  if (!cfg.jwtSecret) problems.push('JWT_SECRET is missing');
  else if (cfg.jwtSecret.includes('<')) problems.push('JWT_SECRET still has a <placeholder> from .env.example');
  else if (cfg.jwtSecret.length < 16) problems.push('JWT_SECRET should be at least 16 characters long');
  if (cfg.corsOrigins.length === 0) problems.push('CORS_ORIGIN is missing (example: http://localhost:5173)');

  if (needSeed) {
    const s = cfg.seed;
    if (!s.viewerUsername || !s.viewerPassword) {
      problems.push('SEED_VIEWER_USERNAME and SEED_VIEWER_PASSWORD are required');
    }
    if (!s.editorUsername || !s.editorPassword) {
      problems.push('SEED_EDITOR_USERNAME and SEED_EDITOR_PASSWORD are required');
    }
    if (s.viewerUsername && s.viewerUsername === s.editorUsername) {
      problems.push('The viewer and editor seed accounts need different usernames');
    }
  }
  return problems;
}

module.exports = { config, checkConfig };
