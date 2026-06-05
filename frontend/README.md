# ⚡ Quizora — Frontend

> A premium, zero-dependency quiz experience built with vanilla HTML, CSS, and JavaScript. Pixel-perfect dark/light theming, real-time countdown timers, confetti celebrations, and a full answer-review flow — all in a single-page app that talks to a REST API.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Screens & App Flow](#screens--app-flow)
- [Architecture](#architecture)
  - [State Management](#state-management)
  - [Screen Management](#screen-management)
  - [Timer Engine](#timer-engine)
  - [Scoring Logic](#scoring-logic)
  - [Audio System](#audio-system)
  - [Confetti Engine](#confetti-engine)
- [Theming System](#theming-system)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [API Contract](#api-contract)
- [Accessibility](#accessibility)
- [Responsive Behaviour](#responsive-behaviour)
- [Browser Support](#browser-support)
- [Design Tokens Reference](#design-tokens-reference)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## Overview

Quizora is a self-contained frontend SPA that fetches a question bank from a backend API, guides the user through a timed multi-choice quiz, submits answers, and renders a detailed result screen — all with fluid animations, ambient audio cues, and a polished glassmorphism UI.

No build step. No framework. No bundler. Open `index.html` and go.

---

## Features

| Category               | Details                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **UI / UX**            | Glassmorphism cards, animated background orbs, noise texture overlay                              |
| **Theming**            | Dark (default) & Light modes via `data-theme` attribute and CSS custom properties                 |
| **Timer**              | Per-question SVG ring countdown (15 s); colour shifts green → amber → red                         |
| **Audio**              | Web Audio API tones for selection, correct, wrong, and tick events — no audio files required      |
| **Confetti**           | Canvas-based particle burst on pass (≥ 60%)                                                       |
| **Keyboard nav**       | `1`–`4` to select an answer, `Enter` / `Space` to advance                                         |
| **Score badge**        | Animates with a "bump" keyframe on every point gain                                               |
| **Review panel**       | Full per-question breakdown with correct/wrong indicators and staggered entrance animation        |
| **Offline resilience** | Score computed client-side if the submit endpoint is unreachable                                  |
| **Accessibility**      | `role="radiogroup"`, `aria-checked`, `aria-label`, `.sr-only` utility class, focus-visible styles |
| **Responsive**         | Single-column layout on ≤ 540 px; keyboard hint hidden on mobile                                  |

---

## Project Structure

```
quizora-frontend/
├── index.html          # Single-page markup — all screens declared here
├── style.css           # Design tokens, animations, component styles
├── script.js           # All app logic (state, fetch, timer, audio, confetti)
└── README.md
```

There are intentionally no subdirectories. The entire frontend ships as three files.

---

## Getting Started

### Prerequisites

- A modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- The [Quizora backend](../backend/README.md) running on `http://localhost:5000`, **or** any HTTP server that satisfies the [API Contract](#api-contract)

### Run locally

```bash
# Clone the repo
git clone https://github.com/your-org/quizora-frontend.git
cd quizora-frontend

# Serve with any static file server — examples:
npx serve .
# or
python3 -m http.server 3000
# or just open index.html directly in a browser
```

> **Note:** If you open `index.html` as a `file://` URL, the `fetch` call to the API will work in most browsers but CORS headers must be set correctly on the backend.

---

## Configuration

All runtime configuration lives at the top of `script.js`:

```js
const API_BASE = "http://localhost:5000"; // Backend origin
const TIMER_SEC = 15; // Seconds per question
```

| Constant       | Default                 | Description                                                  |
| -------------- | ----------------------- | ------------------------------------------------------------ |
| `API_BASE`     | `http://localhost:5000` | Base URL of the backend REST API                             |
| `TIMER_SEC`    | `15`                    | Per-question countdown in seconds                            |
| `TIMER_CIRCUM` | `≈ 169.65`              | SVG stroke-dasharray for the ring (auto-derived from `r=27`) |

No `.env` file, no build step — just edit the constants and save.

---

## Screens & App Flow

```
[loading] ──fetch ok──► [start] ──btn-start──► [quiz] ──all answered──► [submitting] ──► [results]
    │                                                                                          │
    └──fetch fail──► [error] ◄──────────────────────────────── btn-restart ◄──────────────────┘
```

| Screen ID           | Trigger                | Purpose                                                    |
| ------------------- | ---------------------- | ---------------------------------------------------------- |
| `screen-loading`    | App boot               | Fetches questions; enforces 600 ms minimum display         |
| `screen-start`      | Fetch success          | Welcome card with question count, timer info, start button |
| `screen-quiz`       | "Start Quiz" clicked   | One question at a time with timer, options, progress bar   |
| `screen-submitting` | Last question answered | POST answers to API; 800 ms minimum loader                 |
| `screen-results`    | Submit complete        | Score, percentage bar, confetti, answer review             |
| `screen-error`      | Fetch failure          | Error message with retry button that re-runs `init()`      |

---

## Architecture

### State Management

All mutable state lives in module-level variables — no framework, no store:

```js
let questions = []; // Shuffled question array from API
let current = 0; // Index of the active question
let answers = {}; // { questionId: selectedOptionText }
let score = 0; // Running correct-answer count
let timerID = null; // setInterval handle
let timeLeft = TIMER_SEC;
let selected = null; // Currently selected option value
let quizRunning = false; // Guards against input after timer fires
```

### Screen Management

`showScreen(name)` iterates all screen elements and toggles `display: flex` / `.active` class. CSS `animation: screen-in` fires automatically on `.active` via `@keyframes`.

### Timer Engine

- `startTimer()` sets `timeLeft = TIMER_SEC` and starts a 1-second interval.
- Each tick calls `updateTimerDisplay()`, which:
  - Calculates `stroke-dashoffset` from `TIMER_CIRCUM × (1 − fraction)`.
  - Toggles `.warn` (≤ 10 s) and `.danger` (≤ 5 s) classes on both the SVG ring and the number label.
  - Plays a tick tone for the final 5 seconds.
- At `timeLeft === 0`, `autoAdvance()` records a `null` answer and moves to the next question.
- `stopTimer()` is always called before loading a new question and before submitting.

### Scoring Logic

Scoring runs **client-side** in `computeScore()` as a fallback if the backend is unreachable:

```js
function computeScore() {
  return questions.reduce((s, q, i) => {
    const key = q.id || q._id || i;
    const correct = q.answer || q.correctAnswer || q.correct;
    return answers[key] === correct ? s + 1 : s;
  }, 0);
}
```

If the backend returns `{ score: number }`, that value takes precedence.

### Audio System

Implemented with the **Web Audio API** — no audio files required. All sounds are synthesised at runtime:

| Function        | Trigger         | Waveform      | Frequency    |
| --------------- | --------------- | ------------- | ------------ |
| `playSelect()`  | Option clicked  | sine          | 660 Hz       |
| `playSuccess()` | Score ≥ 60%     | sine arpeggio | C5–G5–C6     |
| `playFail()`    | Score < 60%     | sawtooth      | 280 → 220 Hz |
| `playTick()`    | ≤ 5 s remaining | square        | 880 Hz       |

`AudioContext` is lazily created on first use to respect browser autoplay policies.

### Confetti Engine

`launchConfetti()` renders 140 particles on a full-viewport `<canvas>` (`z-index: 10`). Each particle is independently animated via `requestAnimationFrame` for 260 frames (≈ 4.3 s at 60 fps), then the canvas is cleared. Particles are either circles or rectangles, randomly coloured from the design-token palette.

---

## Theming System

Quizora uses CSS custom properties scoped to `[data-theme]` on `<html>`.

```html
<!-- Toggle via JS -->
document.documentElement.setAttribute("data-theme", "light");
```

The `:root` block defines the **dark** defaults. The `[data-theme="light"]` block overrides the subset of tokens that differ. All component styles reference tokens — nothing is hardcoded.

See [Design Tokens Reference](#design-tokens-reference) for the full list.

---

## Keyboard Shortcuts

| Key                | Action                                                |
| ------------------ | ----------------------------------------------------- |
| `1` `2` `3` `4`    | Select answer A/B/C/D                                 |
| `Enter` or `Space` | Advance to next question (when an answer is selected) |

Keyboard shortcuts are only active while `screen-quiz` has the `.active` class and `quizRunning` is `true`.

---

## API Contract

### `GET /questions`

Returns the question bank. Accepted shapes:

```jsonc
// Array (preferred)
[
  {
    "id": "q1",              // or "_id" — used as answers key
    "question": "What is …?",
    "options": ["A", "B", "C", "D"],   // or option1/option2/option3/option4
    "answer": "B"            // or "correctAnswer" / "correct"
  }
]

// Or wrapped object
{ "questions": [ /* same as above */ ] }
```

### `POST /submit`

```jsonc
// Request body
{
  "answers": {
    "q1": "B",
    "q2": null,   // null = timed out / skipped
    "q3": "Paris"
  }
}

// Response (optional — client computes fallback if absent)
{ "score": 2 }
```

Any non-`2xx` response or network failure causes the client to fall back to `computeScore()` and still display results.

---

## Accessibility

- Answer options use `role="radiogroup"` on the container and `role="radio"` + `aria-checked` on each button.
- Theme toggle has `aria-label="Toggle dark/light theme"`.
- Decorative elements (orbs, noise overlay, confetti canvas) are marked `aria-hidden="true"`.
- All interactive elements have `:focus-visible` outlines using `--clr-accent`.
- Screen-reader-only content uses the `.sr-only` utility class (absolute-positioned, 1 px clip).

---

## Responsive Behaviour

| Breakpoint | Change                                                        |
| ---------- | ------------------------------------------------------------- |
| `≤ 540 px` | Options grid collapses to single column                       |
| `≤ 540 px` | Keyboard hint row hidden (`display: none`)                    |
| `≤ 540 px` | Question footer stacks vertically                             |
| `≤ 540 px` | Top bar wraps; progress bar spans full width below score/logo |
| All sizes  | Question text uses `clamp()` for fluid type scale             |

---

## Browser Support

| Browser              | Version | Notes                                           |
| -------------------- | ------- | ----------------------------------------------- |
| Chrome / Edge        | 90+     | Full support                                    |
| Firefox              | 88+     | Full support                                    |
| Safari               | 14+     | Full support; `-webkit-backdrop-filter` applied |
| Mobile Chrome/Safari | Current | Tested; keyboard hint hidden by default         |

> `backdrop-filter` is applied with `-webkit-` prefix for Safari. No polyfill is included — cards fall back gracefully to the opaque `var(--clr-surface)` background.

---

## Design Tokens Reference

| Token            | Dark value                 | Light override           |
| ---------------- | -------------------------- | ------------------------ |
| `--clr-bg`       | `#09090f`                  | `#f4f3ff`                |
| `--clr-surface`  | `rgba(255,255,255,0.04)`   | `rgba(255,255,255,0.72)` |
| `--clr-accent`   | `#7c6bff`                  | —                        |
| `--clr-accent-2` | `#a78bfa`                  | —                        |
| `--clr-success`  | `#22d3a0`                  | —                        |
| `--clr-danger`   | `#ff5f7e`                  | —                        |
| `--clr-warn`     | `#f59e0b`                  | —                        |
| `--font-display` | `"Syne", sans-serif`       | —                        |
| `--font-body`    | `"DM Sans", sans-serif`    | —                        |
| `--radius-xl`    | `32px`                     | —                        |
| `--shadow-btn`   | accent-glow + depth shadow | reduced glow             |
| `--trans-fast`   | `0.18s ease`               | —                        |
| `--trans-med`    | `0.32s ease`               | —                        |
| `--trans-slow`   | `0.50s ease`               | —                        |

Fonts are loaded from Google Fonts (`Syne`, `DM Sans`). For offline environments, supply local equivalents via `@font-face` and update `--font-display` / `--font-body`.

---

## Known Limitations

- **No persistent state** — refreshing during a quiz resets progress.
- **No question categories or difficulty filter** — all questions are presented in a single shuffled pool.
- **Score animation** only counts up; no breakdown by category on the results screen.
- **Confetti** is not accessible — it is purely decorative and correctly marked `aria-hidden`.
- **Audio** silently no-ops in environments that block `AudioContext` creation (e.g. some sandboxed iframes).

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes — keep the zero-dependency, no-build-step philosophy in mind.
3. Test across Chrome, Firefox, and Safari (both themes, mobile viewport).
4. Open a pull request with a clear description of what changed and why.

Code style: 2-space indentation, `"use strict"`, meaningful variable names, no external dependencies.

---

_Built with care — vanilla JS, pure CSS, zero dependencies._
