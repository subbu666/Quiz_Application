// src/data/questions.js
// ─────────────────────────────────────────────────────────────
// In-memory question bank.
// Replace this with a DB adapter (MongoDB / PostgreSQL) without
// changing any controller code — just swap the exported fns.
// ─────────────────────────────────────────────────────────────
"use strict";

/**
 * @typedef {Object} Question
 * @property {string}   id            - Unique stable identifier
 * @property {string}   question      - The question text
 * @property {string[]} options       - Exactly 4 answer choices
 * @property {string}   answer        - Correct option (must match one of options[])
 * @property {string}   category      - Topic tag
 * @property {string}   difficulty    - 'easy' | 'medium' | 'hard'
 * @property {string}   [explanation] - Optional explanation shown after reveal
 */

/** @type {Question[]} */
const QUESTIONS = [
  // ── JavaScript ────────────────────────────────────────────
  {
    id: "js-001",
    question:
      "Which keyword declares a block-scoped variable in modern JavaScript?",
    options: ["var", "let", "def", "dim"],
    answer: "let",
    category: "JavaScript",
    difficulty: "easy",
    explanation:
      "`let` (and `const`) are block-scoped, introduced in ES6. `var` is function-scoped.",
  },
  {
    id: "js-002",
    question: "What does the `typeof null` expression return in JavaScript?",
    options: ["null", "undefined", "object", "boolean"],
    answer: "object",
    category: "JavaScript",
    difficulty: "medium",
    explanation:
      'A long-standing bug in JavaScript — `typeof null` returns "object" rather than "null".',
  },
  {
    id: "js-003",
    question:
      "Which Array method returns a new array with each element transformed by a callback?",
    options: ["forEach", "filter", "map", "reduce"],
    answer: "map",
    category: "JavaScript",
    difficulty: "easy",
    explanation:
      "`Array.prototype.map()` creates a new array populated with the results of calling a function on every element.",
  },
  {
    id: "js-004",
    question: "What is the output of `0.1 + 0.2 === 0.3` in JavaScript?",
    options: ["true", "false", "undefined", "NaN"],
    answer: "false",
    category: "JavaScript",
    difficulty: "medium",
    explanation:
      "Floating-point arithmetic causes `0.1 + 0.2` to equal `0.30000000000000004`, not `0.3`.",
  },
  {
    id: "js-005",
    question: "Which method converts a JavaScript object to a JSON string?",
    options: [
      "JSON.parse()",
      "JSON.stringify()",
      "Object.toString()",
      "JSON.encode()",
    ],
    answer: "JSON.stringify()",
    category: "JavaScript",
    difficulty: "easy",
    explanation:
      "`JSON.stringify()` serialises a value to a JSON string; `JSON.parse()` does the reverse.",
  },

  // ── Node.js ───────────────────────────────────────────────
  {
    id: "node-001",
    question:
      "Which core Node.js module is used to create an HTTP server without Express?",
    options: ["net", "http", "stream", "url"],
    answer: "http",
    category: "Node.js",
    difficulty: "easy",
    explanation:
      "The built-in `http` module exposes `http.createServer()` for creating raw HTTP servers.",
  },
  {
    id: "node-002",
    question: "What does `process.env` give you access to in Node.js?",
    options: [
      "CPU stats",
      "Environment variables",
      "File system paths",
      "Network interfaces",
    ],
    answer: "Environment variables",
    category: "Node.js",
    difficulty: "easy",
    explanation:
      "`process.env` is an object containing the user environment — variables like PORT, NODE_ENV, etc.",
  },
  {
    id: "node-003",
    question:
      "Which Node.js module handles file system operations such as reading and writing files?",
    options: ["path", "os", "fs", "io"],
    answer: "fs",
    category: "Node.js",
    difficulty: "easy",
    explanation:
      "The `fs` (File System) module provides an API for interacting with the file system.",
  },
  {
    id: "node-004",
    question: "In Node.js, what is the Event Loop primarily responsible for?",
    options: [
      "Garbage collection",
      "Handling non-blocking async I/O callbacks",
      "Compiling JavaScript to machine code",
      "Managing process threads",
    ],
    answer: "Handling non-blocking async I/O callbacks",
    category: "Node.js",
    difficulty: "medium",
    explanation:
      "The Event Loop enables Node.js to perform non-blocking I/O by offloading operations to the system kernel and processing callbacks when they complete.",
  },

  // ── Express ───────────────────────────────────────────────
  {
    id: "exp-001",
    question:
      "In Express, which method registers middleware for ALL HTTP methods on a route?",
    options: ["app.get()", "app.post()", "app.use()", "app.all()"],
    answer: "app.use()",
    category: "Express",
    difficulty: "medium",
    explanation:
      "`app.use()` mounts middleware for every request matching the path prefix, regardless of HTTP method.",
  },
  {
    id: "exp-002",
    question: "What is the correct way to send a 404 JSON response in Express?",
    options: [
      "res.send(404)",
      'res.status(404).json({ error: "Not found" })',
      'res.json(404, { error: "Not found" })',
      "res.error(404)",
    ],
    answer: 'res.status(404).json({ error: "Not found" })',
    category: "Express",
    difficulty: "easy",
    explanation:
      "`res.status()` sets the HTTP status code, then `.json()` sends the body and sets Content-Type to application/json.",
  },
  {
    id: "exp-003",
    question:
      "How do you extract a route parameter (e.g. /users/:id) in Express?",
    options: ["req.query.id", "req.params.id", "req.body.id", "req.headers.id"],
    answer: "req.params.id",
    category: "Express",
    difficulty: "easy",
    explanation:
      "Route parameters defined with `:name` syntax are available on the `req.params` object.",
  },
  {
    id: "exp-004",
    question:
      "Which Express middleware parses incoming requests with JSON payloads?",
    options: [
      "express.text()",
      "express.urlencoded()",
      "express.json()",
      "express.multipart()",
    ],
    answer: "express.json()",
    category: "Express",
    difficulty: "easy",
    explanation:
      "`express.json()` is the built-in body parser for JSON. Before Express 4.16 you needed the `body-parser` package.",
  },
  {
    id: "exp-005",
    question: "What does calling `next(err)` inside an Express middleware do?",
    options: [
      "Calls the next route handler",
      "Silently swallows the error",
      "Passes control to the error-handling middleware",
      "Crashes the process",
    ],
    answer: "Passes control to the error-handling middleware",
    category: "Express",
    difficulty: "medium",
    explanation:
      "When you call `next` with an argument, Express skips all remaining non-error middleware and jumps to the next error handler `(err, req, res, next)`.",
  },

  // ── REST / HTTP ────────────────────────────────────────────
  {
    id: "http-001",
    question:
      "Which HTTP status code indicates a successful resource creation (POST)?",
    options: ["200 OK", "201 Created", "204 No Content", "202 Accepted"],
    answer: "201 Created",
    category: "HTTP",
    difficulty: "easy",
    explanation:
      "201 Created means the request was fulfilled and a new resource was created. The URL of the new resource should be in the Location header.",
  },
  {
    id: "http-002",
    question:
      "What does the CORS header `Access-Control-Allow-Origin: *` mean?",
    options: [
      "Only same-origin requests are allowed",
      "Any origin can make requests to this API",
      "Only authenticated requests are allowed",
      "Wildcard requests are blocked",
    ],
    answer: "Any origin can make requests to this API",
    category: "HTTP",
    difficulty: "medium",
    explanation:
      "Setting CORS to `*` allows any domain to access the resource. Useful for public APIs but dangerous for cookie-based auth.",
  },
  {
    id: "http-003",
    question:
      "Which HTTP method is considered idempotent AND safe (no side effects)?",
    options: ["POST", "PUT", "DELETE", "GET"],
    answer: "GET",
    category: "HTTP",
    difficulty: "medium",
    explanation:
      "GET is both safe (no state mutation) and idempotent (multiple identical requests have the same effect). POST is neither.",
  },

  // ── General CS ─────────────────────────────────────────────
  {
    id: "cs-001",
    question:
      "What data structure operates on a Last-In, First-Out (LIFO) principle?",
    options: ["Queue", "Stack", "Heap", "Linked List"],
    answer: "Stack",
    category: "Computer Science",
    difficulty: "easy",
    explanation:
      "A Stack processes elements in LIFO order — push adds to the top, pop removes from the top. The call stack in JS is a real-world example.",
  },
  {
    id: "cs-002",
    question: "What is the time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    answer: "O(log n)",
    category: "Computer Science",
    difficulty: "medium",
    explanation:
      "Binary search halves the search space each iteration, giving O(log n) time complexity — much faster than O(n) linear search.",
  },
  {
    id: "cs-003",
    question:
      "In a RESTful API, which HTTP method should be used to partially update a resource?",
    options: ["PUT", "POST", "PATCH", "UPDATE"],
    answer: "PATCH",
    category: "Computer Science",
    difficulty: "medium",
    explanation:
      "PATCH applies partial modifications to a resource. PUT replaces the resource entirely. Neither PUT nor PATCH are the same as POST (which creates).",
  },
];

// ── Data Access Layer ──────────────────────────────────────────

/**
 * Get all questions (with answer stripped for client delivery)
 * @param {string} [category] - Filter by category
 * @param {string} [difficulty] - Filter by difficulty
 * @returns {Question[]}
 */
function getAllQuestions({ category, difficulty } = {}) {
  let qs = [...QUESTIONS];
  if (category)
    qs = qs.filter((q) => q.category.toLowerCase() === category.toLowerCase());
  if (difficulty) qs = qs.filter((q) => q.difficulty === difficulty);
  return qs;
}

/**
 * Get questions safe for client (answer & explanation stripped)
 * @param {Object} filters
 * @returns {Object[]}
 */
function getQuestionsForClient(filters = {}) {
  return getAllQuestions(filters).map(
    ({ answer, explanation, ...safe }) => safe,
  );
}

/**
 * Find a question by ID (internal use — includes answer)
 * @param {string} id
 * @returns {Question|undefined}
 */
function getQuestionById(id) {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * Return all unique categories
 * @returns {string[]}
 */
function getCategories() {
  return [...new Set(QUESTIONS.map((q) => q.category))];
}

/**
 * Return counts per category / difficulty
 * @returns {Object}
 */
function getStats() {
  const byCategory = {};
  const byDifficulty = {};
  for (const q of QUESTIONS) {
    byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
  }
  return { total: QUESTIONS.length, byCategory, byDifficulty };
}

module.exports = {
  getAllQuestions,
  getQuestionsForClient,
  getQuestionById,
  getCategories,
  getStats,
};
