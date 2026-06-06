// src/controllers/quizController.js
"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  getQuestionsForClient,
  getQuestionById,
  getAllQuestions,
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

/* ── GET /answers ───────────────────────────────────────────
   Returns a flat { [questionId]: answerText } map for a valid
   active session. Lets the frontend score answers live without
   exposing answers before the quiz starts.

   Only works while the session is still active (not submitted).
   ─────────────────────────────────────────────────────────── */
function getAnswers(req, res) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res
      .status(400)
      .json(errorResponse("sessionId query param required"));
  }

  const { valid, reason } = sessionStore.validate(sessionId);
  if (!valid) {
    return res.status(409).json(errorResponse(reason || "Invalid session"));
  }

  // Pull the question IDs that belong to this session
  const session = sessionStore.get(sessionId);
  if (!session || !Array.isArray(session.questionIds)) {
    return res.status(404).json(errorResponse("Session not found"));
  }

  const answerMap = {};
  for (const id of session.questionIds) {
    const q = getQuestionById(id);
    if (q) answerMap[id] = q.answer;
  }

  res.status(200).json({
    success: true,
    answers: answerMap,
  });
}

/* ── POST /submit ───────────────────────────────────────────
   Grades answers server-side (authoritative score).
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
      correct: question.answer,
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
    correctAnswers,
    results,
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
  getAnswers,
  submitQuiz,
  listCategories,
  getQuizStats,
  healthCheck,
};
