// Sprint 3 (B2): health check.
// GET /health -> { "status": "ok", "db": "connected" | "disconnected" }
// No login needed, so a host (or a grader) can quickly check a deployed backend is up.

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res) => {
  // readyState 1 means mongoose has a live connection to MongoDB
  const connected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    db: connected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime())
  });
});

module.exports = router;
