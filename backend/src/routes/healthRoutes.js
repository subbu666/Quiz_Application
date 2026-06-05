// src/routes/healthRoutes.js
"use strict";

const { Router } = require("express");
const { healthCheck } = require("../controllers/quizController");

const router = Router();
router.get("/health", healthCheck);

module.exports = router;
