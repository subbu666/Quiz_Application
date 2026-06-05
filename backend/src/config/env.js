// src/config/env.js
// ─────────────────────────────────────────────────────────────
// Lightweight .env loader — no dotenv dependency needed.
// Reads .env file manually so the project stays dependency-lean.
// ─────────────────────────────────────────────────────────────
"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS: (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500"
  )
    .split(",")
    .map((s) => s.trim()),
  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "900000",
    10,
  ),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  QUIZ_TIME_LIMIT_SEC: parseInt(process.env.QUIZ_TIME_LIMIT_SEC || "15", 10),
  QUIZ_SESSION_TTL_MS: parseInt(
    process.env.QUIZ_SESSION_TTL_MS || "1800000",
    10,
  ),
  isDev: () => env.NODE_ENV === "development",
  isProd: () => env.NODE_ENV === "production",
};

module.exports = env;
