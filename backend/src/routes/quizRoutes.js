// src/routes/quizRoutes.js
// ─────────────────────────────────────────────────────────────
// Route definitions — thin layer, delegates all logic to
// the controller. Adding a new endpoint = 2 lines.
// ─────────────────────────────────────────────────────────────
"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/quizController");

const router = Router();

// ── Quiz endpoints ──────────────────────────────────────────
router.get("/questions", ctrl.getQuestions); // GET  /questions[?category=&difficulty=&limit=]
router.get("/answers", ctrl.getAnswers); // GET  /answers?sessionId=   ← live scoring
router.post("/submit", ctrl.submitQuiz); // POST /submit
router.get("/categories", ctrl.listCategories); // GET  /categories
router.get("/stats", ctrl.getQuizStats); // GET  /stats

module.exports = router;
