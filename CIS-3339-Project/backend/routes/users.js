// This file contains the API endpoint for logging in (the "users" collection)
//
// Sprint 3 (S1):
// - a failed login always answers "Invalid username or password", whether the username or the
//   password was wrong, and takes about the same time either way, so it can't be used to find
//   out which usernames exist
// - username and password must be plain strings (blocks NoSQL injection like { "$ne": null })
// - the token now carries orgId and the user id. requireAuth and withOrg() read the
//   organization from here, never from the request body or URL.
// - tokens expire after JWT_EXPIRES_IN (default 8 hours) instead of 30 days

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { config } = require('../config/env');
const { HttpError, asyncHandler } = require('../utils/http');
const { users } = require('../models/models');

const INVALID_LOGIN = 'Invalid username or password';

// compared against when the username doesn't exist, so both failures cost one bcrypt check
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', 10);

// POST /users/login  { username, password } -> { token }
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      throw new HttpError(400, 'Username and password are required');
    }

    // this backend instance serves one organization (ORG_ID), so only its users can log in
    const user = await users.findOne({ username: username.trim(), orgId: config.orgId });
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordOk) {
      throw new HttpError(400, INVALID_LOGIN);
    }

    const payload = {
      sub: String(user._id),
      name: user.name || user.username,
      role: user.role,
      orgId: String(user.orgId)
    };
    const token = jwt.sign(payload, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn
    });
    res.json({ token });
  })
);

module.exports = router;