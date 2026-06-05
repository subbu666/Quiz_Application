// src/app.js
// ─────────────────────────────────────────────────────────────
// Express application factory.
// Kept separate from server.js so the app can be imported
// cleanly in tests without starting a real TCP server.
// ─────────────────────────────────────────────────────────────
"use strict";

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const {
  corsMiddleware,
  rateLimiter,
  submitLimiter,
  requestLogger,
  notFoundHandler,
  errorHandler,
} = require("./middleware");

const quizRoutes = require("./routes/quizRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app = express();

/* ── Security Headers ────────────────────────────────────── */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

/* ── CORS ────────────────────────────────────────────────── */
app.use(corsMiddleware);

/* ── Body Parsing ────────────────────────────────────────── */
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

/* ── Logging ─────────────────────────────────────────────── */
if (env.isProd()) {
  app.use(morgan("combined"));
} else {
  app.use(requestLogger);
}

/* ── Rate Limiting ───────────────────────────────────────── */
app.use("/api", rateLimiter);
app.use("/api/submit", submitLimiter);

/* ── Routes ──────────────────────────────────────────────── */
// Mount quiz routes at BOTH /api (namespaced) and root / (for frontend compatibility)
app.use("/api", quizRoutes);
app.use("/", quizRoutes);

// Health check at /health (no /api prefix — load balancers hit this directly)
app.use(healthRoutes);

/* ── Catch-All 404 ───────────────────────────────────────── */
app.use(notFoundHandler);

/* ── Global Error Handler (must be last) ─────────────────── */
app.use(errorHandler);

module.exports = app;
