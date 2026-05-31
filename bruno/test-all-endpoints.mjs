const BASE = "http://localhost:8000/api";

let token = null;
let habitId = null;

const log = (label, status, data) => {
  const icon = status >= 200 && status < 300 ? "PASS" : "FAIL";
  console.log(`[${icon}] ${label} (${status})`);
  if (data && typeof data === "object") {
    const msg = data.message || data.error || JSON.stringify(data).slice(0, 120);
    console.log(`      -> ${msg}`);
  }
};

const req = async (method, path, opts = {}) => {
  const url = `${BASE}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : await res.text();
  return { status: res.status, data };
};

console.log("=".repeat(60));
console.log("  AI HABIT TRACKER - API ENDPOINT TEST RUNNER");
console.log("=".repeat(60));

// ── 1. Health ──────────────────────────────────────────────
console.log("\n--- HEALTH ---");
{
  const { status, data } = await req("GET", "/health");
  log("GET /api/health", status, data);
}

// ── 2. Register ────────────────────────────────────────────
console.log("\n--- AUTH: REGISTER ---");
{
  const { status, data } = await req("POST", "/auth/register", {
    body: { name: "Alex", email: "alex@timetoprogram.com", password: "password123" },
  });
  log("POST /api/auth/register", status, data);
  if (status === 201) token = data.token;
}

// ── 3. Login ────────────────────────────────────────────────
console.log("\n--- AUTH: LOGIN ---");
{
  const { status, data } = await req("POST", "/auth/login", {
    body: { email: "alex@timetoprogram.com", password: "password123" },
  });
  log("POST /api/auth/login", status, data);
  if (status === 200) token = data.token;
}

// ── 4. Get Me ───────────────────────────────────────────────
console.log("\n--- AUTH: ME ---");
{
  const { status, data } = await req("GET", "/auth/me");
  log("GET /api/auth/me", status, data);
}

// ── 5. Update Profile (PUT) ─────────────────────────────────
console.log("\n--- AUTH: UPDATE PROFILE ---");
{
  const { status, data } = await req("PUT", "/auth/profile", {
    body: { name: "Alex Updated", morningMotivation: true },
  });
  log("PUT /api/auth/profile", status, data);
}

// ── 6. Create Habit (POST) ──────────────────────────────────
console.log("\n--- HABITS: CREATE ---");
{
  const { status, data } = await req("POST", "/habits", {
    body: {
      name: "Drink 2L of water",
      description: "Stay hydrated throughout the day.",
      category: "Health",
      frequency: "daily",
      targetDays: 7,
      color: "#0ea5e9",
      icon: "💧",
    },
  });
  log("POST /api/habits", status, data);
  if (status === 201) habitId = data._id;
}

// ── 7. List Habits (GET ALL) ────────────────────────────────
console.log("\n--- HABITS: LIST ---");
{
  const { status, data } = await req("GET", "/habits");
  log("GET /api/habits", status, data);
  if (Array.isArray(data) && data.length > 0 && !habitId) {
    habitId = data[0]._id;
  }
}

// ── 8. Update Habit (PUT) ───────────────────────────────────
console.log("\n--- HABITS: UPDATE ---");
if (habitId) {
  const { status, data } = await req("PUT", `/habits/${habitId}`, {
    body: { name: "Drink 3L of water", description: "Even more hydration!" },
  });
  log(`PUT /api/habits/${habitId}`, status, data);
} else {
  console.log("[SKIP] PUT /api/habits/:id  (no habit to update)");
}

// ── 9. Archive Habit (PUT) ──────────────────────────────────
console.log("\n--- HABITS: ARCHIVE ---");
if (habitId) {
  const { status, data } = await req("PUT", `/habits/${habitId}/archive`);
  log(`PUT /api/habits/${habitId}/archive`, status, data);

  // Unarchive so we can use it
  const r2 = await req("PUT", `/habits/${habitId}/archive`);
  log(`PUT /api/habits/${habitId}/archive (unarchive)`, r2.status, r2.data);
} else {
  console.log("[SKIP] PUT /api/habits/:id/archive  (no habit)");
}

// ── 10. Reorder Habits (PUT) ────────────────────────────────
console.log("\n--- HABITS: REORDER ---");
if (habitId) {
  const { status, data } = await req("PUT", "/habits/reorder", {
    body: { order: [habitId] },
  });
  log("PUT /api/habits/reorder", status, data);
} else {
  console.log("[SKIP] PUT /api/habits/reorder  (no habit)");
}

// ── 11. Mark Complete (POST) ────────────────────────────────
console.log("\n--- LOGS: MARK COMPLETE ---");
if (habitId) {
  const { status, data } = await req("POST", "/logs", {
    body: { habitId },
  });
  log("POST /api/logs", status, data);
} else {
  console.log("[SKIP] POST /api/logs  (no habit)");
}

// ── 12. Get Today Logs (GET) ────────────────────────────────
console.log("\n--- LOGS: TODAY ---");
{
  const { status, data } = await req("GET", "/logs/today");
  log("GET /api/logs/today", status, data);
}

// ── 13. Get Logs Range (GET) ────────────────────────────────
console.log("\n--- LOGS: RANGE ---");
{
  const d = new Date();
  const end = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() - 7);
  const start = d.toISOString().slice(0, 10);
  const { status, data } = await req("GET", `/logs/range?start=${start}&end=${end}`);
  log("GET /api/logs/range", status, data);
}

// ── 14. Get Heatmap (GET) ───────────────────────────────────
console.log("\n--- LOGS: HEATMAP ---");
{
  const { status, data } = await req("GET", "/logs/heatmap");
  log("GET /api/logs/heatmap", status, data);
}

// ── 15. Get All Stats (GET) ─────────────────────────────────
console.log("\n--- LOGS: STATS ---");
{
  const { status, data } = await req("GET", "/logs/stats");
  log("GET /api/logs/stats", status, data);
}

// ── 16. Get Habit Stats (GET) ───────────────────────────────
console.log("\n--- LOGS: HABIT STATS ---");
if (habitId) {
  const { status, data } = await req("GET", `/logs/stats/${habitId}`);
  log(`GET /api/logs/stats/${habitId}`, status, data);
} else {
  console.log("[SKIP] GET /api/logs/stats/:habitId  (no habit)");
}

// ── 17. AI Routes ────────────────────────────────────────────
console.log("\n--- AI ---");
{
  const morning = await req("GET", "/ai/morning");
  log("GET /api/ai/morning", morning.status, morning.data);

  const weekly = await req("POST", "/ai/weekly-report");
  log("POST /api/ai/weekly-report", weekly.status, weekly.data);

  const suggestions = await req("POST", "/ai/suggest-habits", {
    body: {
      goals: "Get fitter, read more, and reduce phone time",
      productiveTime: "Early morning",
      struggles: "I keep losing momentum in the evening",
    },
  });
  log("POST /api/ai/suggest-habits", suggestions.status, suggestions.data);

  if (habitId) {
    const recovery = await req("POST", "/ai/recovery-plan", {
      body: { habitId },
    });
    log("POST /api/ai/recovery-plan", recovery.status, recovery.data);
  } else {
    console.log("[SKIP] POST /api/ai/recovery-plan  (no habit)");
  }

  const chat = await req("POST", "/ai/chat", {
    body: { question: "Which day of the week am I most consistent?" },
  });
  log("POST /api/ai/chat", chat.status, chat.data);
}

// ── 18. Unmark Complete (DELETE) ────────────────────────────
console.log("\n--- LOGS: UNMARK ---");
if (habitId) {
  const { status, data } = await req("DELETE", "/logs", {
    body: { habitId },
  });
  log("DELETE /api/logs", status, data);
} else {
  console.log("[SKIP] DELETE /api/logs  (no habit)");
}

// ── 19. Delete Habit (DELETE) ───────────────────────────────
console.log("\n--- HABITS: DELETE ---");
if (habitId) {
  // Re-create a habit to delete (so we don't leave state)
  const cr = await req("POST", "/habits", {
    body: { name: "Temp habit to delete", category: "Other", frequency: "daily" },
  });
  if (cr.status === 201) {
    const delId = cr.data._id;
    const { status, data } = await req("DELETE", `/habits/${delId}`);
    log(`DELETE /api/habits/${delId}`, status, data);
  }
} else {
  console.log("[SKIP] DELETE /api/habits/:id  (no habit)");
}

console.log("\n" + "=".repeat(60));
console.log("  ALL TESTS COMPLETE");
console.log("=".repeat(60));
