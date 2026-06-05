// src/data/sessionStore.js
// ─────────────────────────────────────────────────────────────
// Simple in-memory session store for active quiz sessions.
// Swap for Redis or MongoDB sessions in production without
// changing any controller logic.
// ─────────────────────────────────────────────────────────────
"use strict";

const env = require("../config/env");

/** @type {Map<string, {questionIds: string[], startedAt: number, submitted: boolean}>} */
const store = new Map();

// Periodic cleanup of expired sessions
const CLEANUP_INTERVAL = Math.min(env.QUIZ_SESSION_TTL_MS, 5 * 60 * 1000);
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of store.entries()) {
    if (now - session.startedAt > env.QUIZ_SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}, CLEANUP_INTERVAL).unref(); // .unref() so the timer won't block process exit

const sessionStore = {
  /**
   * Create a new session
   * @param {string} sessionId
   * @param {string[]} questionIds - ordered question IDs served to this client
   */
  create(sessionId, questionIds) {
    store.set(sessionId, {
      questionIds,
      startedAt: Date.now(),
      submitted: false,
    });
  },

  /**
   * Get a session
   * @param {string} sessionId
   * @returns {{ questionIds: string[], startedAt: number, submitted: boolean } | undefined}
   */
  get(sessionId) {
    return store.get(sessionId);
  },

  /**
   * Mark a session as submitted
   * @param {string} sessionId
   */
  markSubmitted(sessionId) {
    const s = store.get(sessionId);
    if (s) s.submitted = true;
  },

  /**
   * Check if a session exists and is still valid (not expired, not already submitted)
   * @param {string} sessionId
   * @returns {{ valid: boolean, reason?: string }}
   */
  validate(sessionId) {
    const s = store.get(sessionId);
    if (!s) return { valid: false, reason: "Session not found" };
    if (s.submitted) return { valid: false, reason: "Quiz already submitted" };
    const elapsed = Date.now() - s.startedAt;
    const maxTime =
      s.questionIds.length * env.QUIZ_TIME_LIMIT_SEC * 1000 + 30_000; // +30s buffer
    if (elapsed > maxTime) return { valid: false, reason: "Session expired" };
    return { valid: true };
  },

  /** Current size for diagnostics */
  size() {
    return store.size;
  },
};

module.exports = sessionStore;
