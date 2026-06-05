// src/validators/quizValidators.js
// ─────────────────────────────────────────────────────────────
// Zod schemas for all incoming payloads.
// Using Zod gives us type-safe parsing + readable error messages
// at zero runtime overhead compared to manual checks.
// ─────────────────────────────────────────────────────────────
"use strict";

const { z } = require("zod");

/**
 * Body: POST /submit
 * {
 *   sessionId: string   (optional — if provided, enables server-side validation)
 *   answers: {
 *     [questionId: string]: string | null
 *   }
 * }
 */
const submitSchema = z.object({
  sessionId: z.string().optional(),
  answers: z
    .record(
      z.string().min(1, "Question ID cannot be empty"),
      z.union([z.string(), z.null()]),
    )
    .refine((val) => Object.keys(val).length > 0, {
      message: "answers must contain at least one entry",
    }),
});

/**
 * Query: GET /questions
 * ?category=JavaScript&difficulty=easy&limit=10
 */
const questionQuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/**
 * Validate a payload against a schema and return structured result
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {{ success: true; data: T } | { success: false; errors: string[] }}
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors = result.error.errors.map(
    (e) => `${e.path.join(".")}: ${e.message}`,
  );
  return { success: false, errors };
}

module.exports = { submitSchema, questionQuerySchema, validate };
