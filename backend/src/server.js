// src/server.js
// ─────────────────────────────────────────────────────────────
// HTTP server entry point.
// Handles startup, graceful shutdown, and uncaught exceptions.
// ─────────────────────────────────────────────────────────────
"use strict";

const http = require("http");
const app = require("./app");
const env = require("./config/env");

const server = http.createServer(app);

/* ── Start ────────────────────────────────────────────────── */
server.listen(env.PORT, () => {
  const divider = "─".repeat(52);
  console.log(`\n\x1b[35m${divider}\x1b[0m`);
  console.log(`  \x1b[1m⚡ Quizora API\x1b[0m  —  \x1b[32mrunning\x1b[0m`);
  console.log(`${divider}`);
  console.log(`  \x1b[90mMode   \x1b[0m  ${env.NODE_ENV}`);
  console.log(`  \x1b[90mPort   \x1b[0m  ${env.PORT}`);
  console.log(
    `  \x1b[90mURL    \x1b[0m  \x1b[36mhttp://localhost:${env.PORT}\x1b[0m`,
  );
  console.log(
    `  \x1b[90mHealth \x1b[0m  \x1b[36mhttp://localhost:${env.PORT}/health\x1b[0m`,
  );
  console.log(`\x1b[35m${divider}\x1b[0m\n`);
  console.log(`  GET  /questions`);
  console.log(`  POST /submit`);
  console.log(`  GET  /categories`);
  console.log(`  GET  /stats`);
  console.log(`  GET  /health`);
  console.log(`\n\x1b[35m${divider}\x1b[0m\n`);
});

/* ── Graceful Shutdown ───────────────────────────────────── */
function shutdown(signal) {
  console.log(`\n\x1b[33m[${signal}]\x1b[0m Gracefully shutting down…`);
  server.close((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    console.log("\x1b[32m[shutdown]\x1b[0m Server closed. Goodbye!\n");
    process.exit(0);
  });

  // Force-kill after 10 s if connections don't drain
  setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* ── Safety Net ─────────────────────────────────────────── */
process.on("unhandledRejection", (reason) => {
  console.error("\x1b[31m[unhandledRejection]\x1b[0m", reason);
  // In prod you'd want to alert + potentially restart; in dev just log
});

process.on("uncaughtException", (err) => {
  console.error("\x1b[31m[uncaughtException]\x1b[0m", err);
  process.exit(1); // Mandatory — state is unknown
});

module.exports = server; // export for integration tests
