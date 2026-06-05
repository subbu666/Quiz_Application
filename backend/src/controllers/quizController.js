// src/controllers/quizController.js
// ─────────────────────────────────────────────────────────────
// All quiz business logic lives here.
// Controllers call the data layer and respond — no raw DB /
// store calls in routes.
// ─────────────────────────────────────────────────────────────
"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  getQuestionsForClient,
  getQuestionById,
  getCategories,
  getStats,
} = require("../data/questions");
const sessionStore = require("../data/sessionStore");
const {
  submitSchema,
  questionQuerySchema,
  validate,
} = require("../validators/quizValidators");

/* ── Helpers ──────────────────────────────────────────────── */

/** Fisher-Yates shuffle (non-mutating) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a consistent error response object */
function errorResponse(message, details = null) {
  const obj = { success: false, error: message };
  if (details) obj.details = details;
  return obj;
}

/* ── GET /questions ─────────────────────────────────────────
   Returns shuffled questions (answers stripped) and creates
   a server-side session for optional validation at submit.
   ─────────────────────────────────────────────────────────── */
function getQuestions(req, res) {
  // Validate query params
  const parsed = validate(questionQuerySchema, req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("Invalid query parameters", parsed.errors));
  }
  const { category, difficulty, limit } = parsed.data;

  let questions = getQuestionsForClient({ category, difficulty });
  questions = shuffle(questions);
  if (limit) questions = questions.slice(0, limit);

  if (!questions.length) {
    return res
      .status(404)
      .json(errorResponse("No questions found for the given filters"));
  }

  // Create a session so we can validate submit later
  const sessionId = uuidv4();
  sessionStore.create(
    sessionId,
    questions.map((q) => q.id),
  );

  res.status(200).json({
    success: true,
    sessionId, // Client should send this back with /submit
    count: questions.length,
    questions,
  });
}

/* ── POST /submit ───────────────────────────────────────────
   Receives { sessionId?, answers: { id: chosenOption } }
   Grades answers and returns score + per-question breakdown.
   ─────────────────────────────────────────────────────────── */
function submitQuiz(req, res) {
  // 1. Validate body schema
  const parsed = validate(submitSchema, req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("Invalid submission payload", parsed.errors));
  }
  const { sessionId, answers } = parsed.data;

  // 2. Session validation (if sessionId provided)
  if (sessionId) {
    const { valid, reason } = sessionStore.validate(sessionId);
    if (!valid) {
      return res.status(409).json(errorResponse(reason || "Invalid session"));
    }
  }

  // 3. Grade
  const results = [];
  let correct = 0;
  const answered = Object.keys(answers);

  for (const questionId of answered) {
    const question = getQuestionById(questionId);
    if (!question) continue; // skip unknown IDs silently

    const chosen = answers[questionId];
    const isCorrect = chosen !== null && chosen === question.answer;
    if (isCorrect) correct++;

    results.push({
      questionId,
      question: question.question,
      chosen: chosen || null,
      correct: question.answer,
      explanation: question.explanation || null,
      isCorrect,
    });
  }

  // 4. Mark session submitted
  if (sessionId) sessionStore.markSubmitted(sessionId);

  // 5. Build response
  const total = results.length;
  const skipped = results.filter((r) => r.chosen === null).length;
  const wrong = total - correct - skipped;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade = getGrade(percentage);

  res.status(200).json({
    success: true,
    score: correct,
    total,
    percentage,
    grade,
    breakdown: { correct, wrong, skipped },
    results, // per-question detail
  });
}

/* ── GET /categories ────────────────────────────────────────
   Returns all available question categories.
   ─────────────────────────────────────────────────────────── */
function listCategories(_req, res) {
  const categories = getCategories();
  res.status(200).json({ success: true, categories });
}

/* ── GET /stats ─────────────────────────────────────────────
   Returns question bank statistics.
   ─────────────────────────────────────────────────────────── */
function getQuizStats(_req, res) {
  const stats = getStats();
  res.status(200).json({ success: true, stats });
}

/* ── GET /health ────────────────────────────────────────────
   Liveness probe used by load balancers / deployment checks.
   ─────────────────────────────────────────────────────────── */
function healthCheck(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "quizora-api",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    sessions: sessionStore.size(),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
}

/* ── Helpers ── */
function getGrade(pct) {
  if (pct === 100) return "S";
  if (pct >= 80) return "A";
  if (pct >= 60) return "B";
  if (pct >= 40) return "C";
  return "F";
}

module.exports = {
  getQuestions,
  submitQuiz,
  listCategories,
  getQuizStats,
  healthCheck,
};
