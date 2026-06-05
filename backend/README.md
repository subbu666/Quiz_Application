# ⚡ Quizora Backend API

Production-grade Node.js + Express REST API for the Quizora quiz application.

## Tech Stack

| Layer      | Choice                            | Why                                        |
| ---------- | --------------------------------- | ------------------------------------------ |
| Runtime    | Node.js 18+                       | LTS, native fetch, ESM support             |
| Framework  | Express 4                         | Battle-tested, minimal overhead            |
| Validation | Zod                               | Type-safe schema parsing with great errors |
| Security   | Helmet + rate-limiter             | Industry-standard hardening                |
| Logging    | Morgan (prod) + custom dev logger | Environment-appropriate output             |
| Sessions   | In-memory Map                     | Zero-dep, swap for Redis in prod           |

---

## Project Structure

```
quizora-backend/
├── src/
│   ├── config/
│   │   └── env.js              # Env var loader + typed config object
│   ├── controllers/
│   │   └── quizController.js   # All business logic (grading, scoring)
│   ├── data/
│   │   ├── questions.js        # Question bank + data access layer
│   │   └── sessionStore.js     # In-memory session management
│   ├── middleware/
│   │   └── index.js            # CORS, rate limiting, error handling
│   ├── routes/
│   │   ├── quizRoutes.js       # Quiz endpoints
│   │   └── healthRoutes.js     # Health check
│   ├── utils/
│   │   └── testRunner.js       # Zero-dep integration tests
│   ├── app.js                  # Express app factory (no listen)
│   └── server.js               # HTTP server + graceful shutdown
├── .env                        # Local secrets (gitignored)
├── .env.example                # Documented env template
└── package.json
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env as needed

# 3. Start in development (auto-reload)
npm run dev

# 4. Start in production
NODE_ENV=production npm start
```

Server boots on **http://localhost:5000** by default.

---

## API Reference

### `GET /questions`

Returns shuffled questions (answers stripped) and creates a server-side session.

**Query parameters:**

| Param        | Type                         | Description                            |
| ------------ | ---------------------------- | -------------------------------------- |
| `category`   | string                       | Filter by category (e.g. `JavaScript`) |
| `difficulty` | `easy` \| `medium` \| `hard` | Filter by difficulty                   |
| `limit`      | number (1–50)                | Cap number of questions returned       |

**Response `200`:**

```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "count": 20,
  "questions": [
    {
      "id": "js-001",
      "question": "Which keyword declares a block-scoped variable?",
      "options": ["var", "let", "def", "dim"],
      "category": "JavaScript",
      "difficulty": "easy"
    }
  ]
}
```

---

### `POST /submit`

Grades submitted answers and returns a full result breakdown.

**Request body:**

```json
{
  "sessionId": "550e8400-...",
  "answers": {
    "js-001": "let",
    "js-002": "object",
    "js-003": null
  }
}
```

- `sessionId` is optional but recommended (enables duplicate-submission protection)
- `answers` maps question IDs to selected options; `null` means skipped

**Response `200`:**

```json
{
  "success": true,
  "score": 4,
  "total": 5,
  "percentage": 80,
  "grade": "A",
  "breakdown": { "correct": 4, "wrong": 0, "skipped": 1 },
  "results": [
    {
      "questionId": "js-001",
      "question": "Which keyword declares a block-scoped variable?",
      "chosen": "let",
      "correct": "let",
      "explanation": "`let` and `const` are block-scoped, introduced in ES6.",
      "isCorrect": true
    }
  ]
}
```

**Error `409`** — Session already submitted or expired  
**Error `400`** — Validation failure

---

### `GET /categories`

```json
{
  "success": true,
  "categories": ["JavaScript", "Node.js", "Express", "HTTP", "Computer Science"]
}
```

### `GET /stats`

```json
{
  "success": true,
  "stats": {
    "total": 20,
    "byCategory": {
      "JavaScript": 5,
      "Node.js": 4,
      "Express": 5,
      "HTTP": 3,
      "Computer Science": 3
    },
    "byDifficulty": { "easy": 10, "medium": 10 }
  }
}
```

### `GET /health`

Liveness probe for load balancers.

```json
{
  "status": "ok",
  "service": "quizora-api",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 3600,
  "sessions": 12,
  "memory": { "heapUsedMB": 28 }
}
```

---

## Grading Scale

| Percentage | Grade |
| ---------- | ----- |
| 100%       | S     |
| 80–99%     | A     |
| 60–79%     | B     |
| 40–59%     | C     |
| < 40%      | F     |

---

## Running Tests

Start the server first, then in a separate terminal:

```bash
npm test
```

The test runner uses Node's built-in `http` module — no external test framework needed.

---

## Adding Questions

Edit `src/data/questions.js`. Each question must match this shape:

```js
{
  id:          'unique-kebab-id',   // stable, used as answer map key
  question:    'Question text?',
  options:     ['A', 'B', 'C', 'D'],   // exactly 4
  answer:      'B',                // must match one of options[]
  category:    'My Category',
  difficulty:  'easy',             // easy | medium | hard
  explanation: 'Optional explanation shown after submit',
}
```

---

## Scaling to Production

| What              | How                                                                          |
| ----------------- | ---------------------------------------------------------------------------- |
| Persist sessions  | Swap `sessionStore.js` for `ioredis` adapter                                 |
| Persist questions | Swap `questions.js` for a MongoDB/PostgreSQL adapter                         |
| Auth              | Add JWT middleware before quiz routes                                        |
| Horizontal scale  | Sessions in Redis → stateless Node instances                                 |
| Containerise      | Dockerfile: `node:20-alpine`, `EXPOSE 5000`, `CMD ["node", "src/server.js"]` |
