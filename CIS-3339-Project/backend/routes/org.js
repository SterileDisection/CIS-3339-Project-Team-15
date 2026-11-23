// This file contains the API endpoint for the "org" collection in the MongoDB database
//
// GET /org -> the name of the organization this backend instance is configured for (ORG_ID).
// It stays public on purpose: the navigation bar shows the name before anyone logs in, and it
// returns nothing but the name.
//
// Sprint 3: async/await + central error handler; "not found" is now 404 (was 400).

const express = require('express');
const router = express.Router();

const { config } = require('../config/env');
const { HttpError, asyncHandler } = require('../utils/http');
const { orgs } = require('../models/models');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const org = await orgs.findById(config.orgId).select('name').lean();
    if (!org) {
      throw new HttpError(404, 'Organization not found. Run "npm run db:init" in the backend folder.');
    }
    res.json(org.name);
  })
);

module.exports = router;