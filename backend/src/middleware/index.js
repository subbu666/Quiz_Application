// src/middleware/index.js
// ─────────────────────────────────────────────────────────────
// All application-level middleware, exported as factory fns
// so they can be tested in isolation.
// ─────────────────────────────────────────────────────────────
"use strict";

const rateLimit = require("express-rate-limit");
const env = require("../config/env");

/* ── CORS ─────────────────────────────────────────────────── */
/**
 * Manual CORS handler — gives us full control over preflight
 * without the express-cors package complexities.
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = env.ALLOWED_ORIGINS;

  // Allow listed origins OR all in development
  const isAllowed =
    env.isDev() || allowed.includes(origin) || allowed.includes("*");

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Session-Id",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400"); // preflight cache: 24h
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

/* ── Rate Limiter ─────────────────────────────────────────── */
const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests — please try again later.",
  },
  skip: () => env.isDev(), // disable in development for easier testing
});

/* ── Submit-specific stricter limiter ─────────────────────── */
const submitLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // max 10 submissions per minute per IP
  message: {
    success: false,
    error: "Too many submissions. Please wait before trying again.",
  },
  skip: () => env.isDev(),
});

/* ── Request Logger (dev-friendly + prod-safe) ────────────── */
function requestLogger(req, _res, next) {
  if (env.isProd()) return next(); // use morgan in prod (see app.js)
  const ts = new Date().toISOString().slice(11, 23);
  const color =
    { GET: "\x1b[32m", POST: "\x1b[34m", DELETE: "\x1b[31m" }[req.method] ||
    "\x1b[33m";
  console.log(
    `  \x1b[90m${ts}\x1b[0m ${color}${req.method}\x1b[0m ${req.originalUrl}`,
  );
  next();
}

/* ── 404 Handler ──────────────────────────────────────────── */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "Available routes: GET /questions, POST /submit, GET /categories, GET /stats, GET /health",
  });
}

/* ── Global Error Handler ─────────────────────────────────── */
// Must have 4 params for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Log full error in dev, just message in prod
  if (env.isDev()) {
    console.error("\n\x1b[31m[ERROR]\x1b[0m", err.stack || err);
  } else {
    console.error(`[ERROR] ${status} — ${err.message}`);
  }

  const body = {
    success: false,
    error: status < 500 ? err.message : "Internal server error",
  };
  if (env.isDev() && status === 500) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = {
  corsMiddleware,
  rateLimiter,
  submitLimiter,
  requestLogger,
  notFoundHandler,
  errorHandler,
};
