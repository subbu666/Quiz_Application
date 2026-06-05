// src/controllers/quizController.js
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function errorResponse(message, details = null) {
  const obj = { success: false, error: message };
  if (details) obj.details = details;
  return obj;
}

/* ── GET /questions ─────────────────────────────────────────
   Strips answers before sending to client.
   ─────────────────────────────────────────────────────────── */
function getQuestions(req, res) {
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

  const sessionId = uuidv4();
  sessionStore.create(
    sessionId,
    questions.map((q) => q.id),
  );

  res.status(200).json({
    success: true,
    sessionId,
    count: questions.length,
    questions,
  });
}

/* ── POST /submit ───────────────────────────────────────────
   Grades answers. Returns:
     - score / total / percentage / grade
     - breakdown { correct, wrong, skipped }
     - results[]  — per-question detail incl. correct answer
     - correctAnswers { [questionId]: answerText }  ← NEW
       A flat map so the frontend can do O(1) lookups for the
       review panel without iterating the full results array.
   ─────────────────────────────────────────────────────────── */
function submitQuiz(req, res) {
  const parsed = validate(submitSchema, req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse("Invalid submission payload", parsed.errors));
  }
  const { sessionId, answers } = parsed.data;

  if (sessionId) {
    const { valid, reason } = sessionStore.validate(sessionId);
    if (!valid) {
      return res.status(409).json(errorResponse(reason || "Invalid session"));
    }
  }

  const results = [];
  let correct = 0;

  for (const questionId of Object.keys(answers)) {
    const question = getQuestionById(questionId);
    if (!question) continue;

    const chosen = answers[questionId];
    const isCorrect = chosen !== null && chosen === question.answer;
    if (isCorrect) correct++;

    results.push({
      questionId,
      question: question.question,
      chosen: chosen || null,
      correct: question.answer, // ← already present, now explicitly relied on
      explanation: question.explanation || null,
      isCorrect,
    });
  }

  if (sessionId) sessionStore.markSubmitted(sessionId);

  const total = results.length;
  const skipped = results.filter((r) => r.chosen === null).length;
  const wrong = total - correct - skipped;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade = getGrade(percentage);

  // Flat map: { [questionId]: correctAnswerText }
  // Lets the frontend skip iterating results[] for every review row.
  const correctAnswers = Object.fromEntries(
    results.map((r) => [r.questionId, r.correct]),
  );

  res.status(200).json({
    success: true,
    score: correct,
    total,
    percentage,
    grade,
    breakdown: { correct, wrong, skipped },
    correctAnswers, // ← new flat map
    results, // ← full per-question detail (unchanged)
  });
}

/* ── GET /categories ─────────────────────────────────────── */
function listCategories(_req, res) {
  const categories = getCategories();
  res.status(200).json({ success: true, categories });
}

/* ── GET /stats ──────────────────────────────────────────── */
function getQuizStats(_req, res) {
  const stats = getStats();
  res.status(200).json({ success: true, stats });
}

/* ── GET /health ─────────────────────────────────────────── */
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
