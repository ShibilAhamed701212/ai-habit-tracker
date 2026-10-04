import { test } from "node:test";
import assert from "node:assert/strict";
import { format, subDays } from "date-fns";

process.env.GEMINI_API_KEY = "";
process.env.OPENROUTER_API_KEY = "";

const { calcStreak } = await import("../utils/dateHelpers.js");
const { sanitizeHistory, normalizeSuggestions } = await import(
  "../controllers/aiController.js"
);

const key = (d) => format(d, "yyyy-MM-dd");

test("calcStreak counts a run ending yesterday as current", () => {
  const keys = [1, 2, 3].map((i) => key(subDays(new Date(), i)));
  assert.deepEqual(calcStreak(keys), { current: 3, longest: 3 });
});

test("calcStreak resets current after a gap but keeps longest", () => {
  const keys = [5, 6, 7, 8].map((i) => key(subDays(new Date(), i)));
  assert.deepEqual(calcStreak(keys), { current: 0, longest: 4 });
});

test("sanitizeHistory drops system roles, non-strings and the duplicated question", () => {
  const out = sanitizeHistory(
    [
      { role: "system", content: "evil" },
      { role: "assistant", content: "hi" },
      { role: "user", content: { x: 1 } },
      "junk",
      { role: "user", content: "How am I doing?" },
    ],
    "How am I doing?",
  );
  assert.deepEqual(out, [{ role: "assistant", content: "hi" }]);
  assert.deepEqual(sanitizeHistory("not an array"), []);
});

test("sanitizeHistory keeps only the most recent turns", () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ role: "user", content: `q${i}` }));
  const out = sanitizeHistory(many);
  assert.equal(out.length, 20);
  assert.equal(out.at(-1).content, "q49");
});

test("normalizeSuggestions maps unknown categories to Other", () => {
  const out = normalizeSuggestions([
    { name: "Stretch", category: "wellness", frequency: "hourly" },
    { name: "Budget review", category: "finance", frequency: "weekly" },
    { description: "no name" },
    null,
  ]);
  assert.deepEqual(
    out.map(({ name, category, frequency }) => ({ name, category, frequency })),
    [
      { name: "Stretch", category: "Other", frequency: "daily" },
      { name: "Budget review", category: "Finance", frequency: "weekly" },
    ],
  );
});
