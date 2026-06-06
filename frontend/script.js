/* ─────────────────────────────────────────
   QUIZORA — Premium Quiz App Script
   ───────────────────────────────────────── */

"use strict";

/* ── Config ── */
const API_BASE = "https://quizapplication-production-52ec.up.railway.app";
const TIMER_SEC = 15;
const TIMER_CIRCUM = 2 * Math.PI * 27;

/* ── State ── */
let questions = [];
let current = 0;
let answers = {};
let correctAnswers = {};
let score = 0;
let sessionId = null;
let timerID = null;
let timeLeft = TIMER_SEC;
let selected = null;
let quizRunning = false;

/* ── DOM Refs ── */
const $ = (id) => document.getElementById(id);
const screens = {
  loading: $("screen-loading"),
  start: $("screen-start"),
  quiz: $("screen-quiz"),
  submitting: $("screen-submitting"),
  results: $("screen-results"),
  error: $("screen-error"),
};

/* ── Audio ── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}
function playTone(freq, type = "sine", vol = 0.12, dur = 0.12) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}
function playSelect() {
  playTone(660, "sine", 0.1, 0.1);
}
function playSuccess() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, "sine", 0.12, 0.18), i * 80),
  );
}
function playFail() {
  playTone(280, "sawtooth", 0.08, 0.25);
  setTimeout(() => playTone(220, "sawtooth", 0.06, 0.2), 120);
}
function playTick() {
  playTone(880, "square", 0.04, 0.05);
}

/* ─────────────────────────────────────────
   SCREEN MANAGEMENT
   ───────────────────────────────────────── */
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.style.display = "flex";
      el.classList.add("active");
    } else {
      el.classList.remove("active");
      el.style.display = "none";
    }
  });
}

/* ─────────────────────────────────────────
   INIT / FETCH
   ───────────────────────────────────────── */
async function init() {
  showScreen("loading");
  try {
    const res = await fetch(`${API_BASE}/questions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    questions = shuffle(Array.isArray(data) ? data : data.questions || []);
    sessionId = data.sessionId || null;

    if (!questions.length) throw new Error("No questions returned");
    $("meta-q-count").textContent = `${questions.length} Questions`;
    await sleep(600);
    showScreen("start");
  } catch (err) {
    $("error-msg").textContent =
      err.message || "Could not connect to the server.";
    showScreen("error");
  }
}

/* ─────────────────────────────────────────
   FETCH ANSWERS FOR LIVE SCORING
   ───────────────────────────────────────── */
async function fetchAnswers() {
  if (!sessionId) return;
  try {
    const res = await fetch(`${API_BASE}/answers?sessionId=${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.answers) {
      correctAnswers = data.answers;
    }
  } catch (_) {}
}

/* ─────────────────────────────────────────
   QUIZ FLOW
   ───────────────────────────────────────── */
async function startQuiz() {
  questions = shuffle(questions);
  current = 0;
  answers = {};
  correctAnswers = {};
  score = 0;
  selected = null;
  updateScoreBadge();
  showScreen("quiz");
  fetchAnswers(); // background — populates correctAnswers for scoring on Next
  loadQuestion(0, false);
}

function loadQuestion(idx, animate = true) {
  const q = questions[idx];
  quizRunning = true;
  selected = null;
  const btn = $("btn-next");
  btn.disabled = true;

  const card = $("question-card");
  const doLoad = () => {
    const pct = (idx / questions.length) * 100;
    $("progress-fill").style.width = `${pct}%`;
    $("progress-label").textContent =
      `Question ${idx + 1} of ${questions.length}`;
    $("q-num").textContent = String(idx + 1).padStart(2, "0");
    $("q-text").textContent = q.question;
    renderOptions(q);
    startTimer();
    card.classList.remove("question-exiting");
    card.classList.add("question-entering");
    setTimeout(() => card.classList.remove("question-entering"), 400);
  };

  if (animate) {
    card.classList.add("question-exiting");
    setTimeout(doLoad, 200);
  } else {
    doLoad();
  }
}

function renderOptions(q) {
  const grid = $("options-grid");
  grid.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  const opts =
    q.options || [q.option1, q.option2, q.option3, q.option4].filter(Boolean);

  opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.dataset.index = i;
    btn.dataset.value = opt;
    btn.innerHTML = `
      <span class="option-letter">${letters[i]}</span>
      <span class="option-text">${opt}</span>`;
    btn.addEventListener("click", () => selectOption(btn, opt));
    grid.appendChild(btn);
  });
}

/* ─────────────────────────────────────────
   SELECT OPTION — just tracks selection, no scoring here
   ───────────────────────────────────────── */
function selectOption(btnEl, value) {
  if (!quizRunning) return;
  playSelect();
  document.querySelectorAll(".option-btn").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-checked", "false");
  });
  btnEl.classList.add("selected");
  btnEl.setAttribute("aria-checked", "true");
  selected = value;
  $("btn-next").disabled = false;
  addRipple($("btn-next"));
}

/* ─────────────────────────────────────────
   NEXT — score is updated HERE, after committing the answer
   ───────────────────────────────────────── */
function nextQuestion() {
  if (selected === null) return;
  stopTimer();

  const q = questions[current];
  const key = q.id || q._id || current;

  // Record the answer
  answers[key] = selected;

  // ── Score update on commit ─────────────────────────────────
  // Only runs if /answers already returned (correctAnswers populated).
  // User can no longer change their answer at this point.
  if (Object.keys(correctAnswers).length > 0) {
    const correct = correctAnswers[key];
    if (correct && selected === correct) {
      score++;
      updateScoreBadge();
    }
  }

  current++;
  if (current < questions.length) {
    loadQuestion(current, true);
  } else {
    submitQuiz();
  }
}

/* ─────────────────────────────────────────
   TIMER
   ───────────────────────────────────────── */
function startTimer() {
  stopTimer();
  timeLeft = TIMER_SEC;
  updateTimerDisplay();
  timerID = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 5) playTick();
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      autoAdvance();
    }
  }, 1000);
}

function stopTimer() {
  if (timerID) {
    clearInterval(timerID);
    timerID = null;
  }
}

function updateTimerDisplay() {
  const ring = $("ring-fill");
  const numEl = $("timer-num");
  const frac = timeLeft / TIMER_SEC;
  const offset = TIMER_CIRCUM * (1 - frac);
  ring.style.strokeDasharray = TIMER_CIRCUM;
  ring.style.strokeDashoffset = offset;
  numEl.textContent = timeLeft;
  const warn = timeLeft <= 10 && timeLeft > 5;
  const danger = timeLeft <= 5;
  ring.classList.toggle("warn", warn && !danger);
  ring.classList.toggle("danger", danger);
  numEl.classList.toggle("warn", warn && !danger);
  numEl.classList.toggle("danger", danger);
}

/* ─────────────────────────────────────────
   AUTO-ADVANCE (timer ran out — null answer, no score)
   ───────────────────────────────────────── */
function autoAdvance() {
  const q = questions[current];
  const key = q.id || q._id || current;
  answers[key] = null; // timed out — no score, no update to badge
  current++;
  if (current < questions.length) {
    loadQuestion(current, true);
  } else {
    submitQuiz();
  }
}

/* ─────────────────────────────────────────
   SUBMIT — server score is always authoritative
   ───────────────────────────────────────── */
async function submitQuiz() {
  quizRunning = false;
  stopTimer();
  showScreen("submitting");

  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.score === "number") score = data.score;
      if (data.correctAnswers && typeof data.correctAnswers === "object") {
        correctAnswers = data.correctAnswers;
      } else if (Array.isArray(data.results)) {
        data.results.forEach((r) => {
          correctAnswers[r.questionId] = r.correct;
        });
      }
      updateScoreBadge();
    } else {
      console.warn("Submit returned", res.status);
      updateScoreBadge();
    }
  } catch (err) {
    console.warn("Submit failed:", err.message);
    updateScoreBadge();
  }

  await sleep(800);
  showResults();
}

/* ─────────────────────────────────────────
   RESULTS
   ───────────────────────────────────────── */
function showResults() {
  showScreen("results");
  const total = questions.length;
  const pct = Math.round((score / total) * 100);

  const { icon, title } = getResultsMood(pct);
  $("results-trophy").textContent = icon;
  $("results-title").textContent = title;

  animateNumber($("score-num"), 0, score, 900);
  $("score-denom").textContent = `/${total}`;
  $("percent-label").textContent = `${pct}%`;

  setTimeout(() => {
    $("percent-bar").style.width = `${pct}%`;
  }, 100);

  buildReview();
  pct >= 60 ? playSuccess() : playFail();
  if (pct >= 60) launchConfetti();
}

function getResultsMood(pct) {
  if (pct === 100) return { icon: "🏆", title: "Perfect Score!" };
  if (pct >= 80) return { icon: "🎉", title: "Brilliant!" };
  if (pct >= 60) return { icon: "😄", title: "Well Done!" };
  if (pct >= 40) return { icon: "🤔", title: "Not Bad…" };
  return { icon: "💪", title: "Keep Practicing!" };
}

/* ─────────────────────────────────────────
   REVIEW
   ───────────────────────────────────────── */
function buildReview() {
  const list = $("review-list");
  list.innerHTML = "";
  questions.forEach((q, i) => {
    const key = q.id || q._id || i;
    const correct = correctAnswers[key] || "";
    const given = answers[key] || null;
    const isRight = Boolean(given && given === correct);

    const item = document.createElement("div");
    item.className = `review-item ${isRight ? "correct" : "wrong"}`;
    item.style.animationDelay = `${i * 60}ms`;
    item.innerHTML = `
      <span class="review-badge">${isRight ? "✅" : "❌"}</span>
      <p class="review-q">${i + 1}. ${q.question}</p>
      <div class="review-answers">
        <div class="review-answer user">
          Your answer: <span>${given || "—"}</span>
        </div>
        ${
          !isRight && correct
            ? `<div class="review-answer correct-ans">
                 Correct: <span>${correct}</span>
               </div>`
            : ""
        }
      </div>`;
    list.appendChild(item);
  });
}

/* ─────────────────────────────────────────
   SCORE BADGE
   ───────────────────────────────────────── */
function updateScoreBadge() {
  const el = $("score-badge");
  el.textContent = `Score: ${score}`;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

/* ─────────────────────────────────────────
   CONFETTI
   ───────────────────────────────────────── */
function launchConfetti() {
  const canvas = $("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = [
    "#7c6bff",
    "#a78bfa",
    "#f0abfc",
    "#22d3a0",
    "#fbbf24",
    "#f87171",
    "#60a5fa",
  ];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -Math.random() * canvas.height * 0.5,
    r: Math.random() * 6 + 3,
    d: Math.random() * 3 + 1.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    angle: Math.random() * Math.PI * 2,
    rot: (Math.random() - 0.5) * 0.25,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    w: Math.random() * 10 + 6,
    h: Math.random() * 5 + 3,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 220);
      if (p.shape === "rect") {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      p.y += p.d + frame * 0.015;
      p.x += Math.sin(frame * 0.02 + p.rot) * 1.2;
      p.angle += p.rot;
      if (p.y > canvas.height + 20) p.y = -20;
    });
    frame++;
    if (frame < 260) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

/* ─────────────────────────────────────────
   RIPPLE
   ───────────────────────────────────────── */
function addRipple(btn) {
  btn.classList.remove("ripple");
  void btn.offsetWidth;
  btn.classList.add("ripple");
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (btn) addRipple(btn);
});

/* ─────────────────────────────────────────
   THEME TOGGLE
   ───────────────────────────────────────── */
$("btn-theme").addEventListener("click", () => {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  $("btn-theme").querySelector(".theme-icon").textContent = isDark
    ? "🌙"
    : "☀️";
});

/* ─────────────────────────────────────────
   KEYBOARD NAV
   ───────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  if (!screens.quiz.classList.contains("active")) return;
  if (!quizRunning) return;
  const opts = document.querySelectorAll(".option-btn:not(:disabled)");
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= opts.length) {
    const target = opts[num - 1];
    target.click();
    target.focus();
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && !$("btn-next").disabled) {
    e.preventDefault();
    nextQuestion();
  }
});

/* ─────────────────────────────────────────
   EVENT LISTENERS
   ───────────────────────────────────────── */
$("btn-start").addEventListener("click", () => {
  playSelect();
  startQuiz();
});
$("btn-next").addEventListener("click", () => {
  if (!$("btn-next").disabled) nextQuestion();
});
$("btn-restart").addEventListener("click", () => {
  playSelect();
  startQuiz();
});
$("btn-retry").addEventListener("click", () => {
  init();
});

/* ─────────────────────────────────────────
   UTILS
   ───────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function animateNumber(el, from, to, dur) {
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Boot ── */
init();
