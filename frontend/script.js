/* ─────────────────────────────────────────
   QUIZORA — Premium Quiz App Script
   ───────────────────────────────────────── */

"use strict";

/* ── Config ── */
const API_BASE = "http://localhost:5000";
const TIMER_SEC = 15;
const TIMER_CIRCUM = 2 * Math.PI * 27; // r=27 in SVG (≈169.646)

/* ── State ── */
let questions = [];
let current = 0;
let answers = {};
let score = 0;
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

/* ── Audio (Web Audio API tones) ── */
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
    if (!questions.length) throw new Error("No questions returned");
    $("meta-q-count").textContent = `${questions.length} Questions`;
    // Small min-delay so loader doesn't flash
    await sleep(600);
    showScreen("start");
  } catch (err) {
    $("error-msg").textContent =
      err.message || "Could not connect to the server.";
    showScreen("error");
  }
}

/* ─────────────────────────────────────────
   QUIZ FLOW
   ───────────────────────────────────────── */
function startQuiz() {
  questions = shuffle(questions);
  current = 0;
  answers = {};
  score = 0;
  selected = null;
  updateScoreBadge();
  showScreen("quiz");
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
    // Progress
    const pct = (idx / questions.length) * 100;
    $("progress-fill").style.width = `${pct}%`;
    $("progress-label").textContent =
      `Question ${idx + 1} of ${questions.length}`;
    // Question number
    $("q-num").textContent = String(idx + 1).padStart(2, "0");
    // Text
    $("q-text").textContent = q.question;
    // Options
    renderOptions(q);
    // Timer
    startTimer();
    // Animate in
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

function selectOption(btnEl, value) {
  if (!quizRunning) return;
  playSelect();
  // Deselect all
  document.querySelectorAll(".option-btn").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-checked", "false");
  });
  // Select clicked
  btnEl.classList.add("selected");
  btnEl.setAttribute("aria-checked", "true");
  selected = value;
  $("btn-next").disabled = false;
  addRipple($("btn-next"));
}

function nextQuestion() {
  if (selected === null) return;
  stopTimer();
  answers[questions[current].id || questions[current]._id || current] =
    selected;

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

function autoAdvance() {
  // Record as skipped
  const q = questions[current];
  answers[q.id || q._id || current] = null;
  current++;
  if (current < questions.length) {
    loadQuestion(current, true);
  } else {
    submitQuiz();
  }
}

/* ─────────────────────────────────────────
   SUBMIT
   ───────────────────────────────────────── */
async function submitQuiz() {
  quizRunning = false;
  stopTimer();
  showScreen("submitting");

  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = res.ok ? await res.json() : null;
    // Compute score client-side as fallback
    score = computeScore();
    if (data && typeof data.score === "number") score = data.score;
    await sleep(800);
    showResults();
  } catch (_) {
    // Offline / backend down — still show results computed client-side
    score = computeScore();
    await sleep(800);
    showResults();
  }
}

function computeScore() {
  let s = 0;
  questions.forEach((q, i) => {
    const key = q.id || q._id || i;
    const correct = q.answer || q.correctAnswer || q.correct;
    if (answers[key] && answers[key] === correct) s++;
  });
  return s;
}

/* ─────────────────────────────────────────
   RESULTS
   ───────────────────────────────────────── */
function showResults() {
  showScreen("results");
  const total = questions.length;
  const pct = Math.round((score / total) * 100);

  // Emoji / title
  const { icon, title } = getResultsMood(pct);
  $("results-trophy").textContent = icon;
  $("results-title").textContent = title;

  // Score counter animation
  animateNumber($("score-num"), 0, score, 900);
  $("score-denom").textContent = `/${total}`;
  $("percent-label").textContent = `${pct}%`;

  setTimeout(() => {
    $("percent-bar").style.width = `${pct}%`;
  }, 100);

  // Review list
  buildReview();

  // Sound
  pct >= 60 ? playSuccess() : playFail();

  // Confetti if passed
  if (pct >= 60) launchConfetti();
}

function getResultsMood(pct) {
  if (pct === 100) return { icon: "🏆", title: "Perfect Score!" };
  if (pct >= 80) return { icon: "🎉", title: "Brilliant!" };
  if (pct >= 60) return { icon: "😄", title: "Well Done!" };
  if (pct >= 40) return { icon: "🤔", title: "Not Bad…" };
  return { icon: "💪", title: "Keep Practicing!" };
}

function buildReview() {
  const list = $("review-list");
  list.innerHTML = "";
  questions.forEach((q, i) => {
    const key = q.id || q._id || i;
    const correct = q.answer || q.correctAnswer || q.correct || "";
    const given = answers[key] || null;
    const isRight = given && given === correct;

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
          !isRight
            ? `<div class="review-answer correct-ans">
          Correct: <span>${correct}</span>
        </div>`
            : ""
        }
      </div>`;
    list.appendChild(item);
  });
}

function updateScoreBadge() {
  const el = $("score-badge");
  el.textContent = `Score: ${score}`;
  el.classList.remove("bump");
  void el.offsetWidth; // reflow
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
   RIPPLE EFFECT
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
   KEYBOARD NAVIGATION
   ───────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  const screenQuiz = screens.quiz;
  if (!screenQuiz.classList.contains("active")) return;
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

/* ─────────────────────────────────────────
   BOOT
   ───────────────────────────────────────── */
init();
