import Habit, { HABIT_CATEGORIES } from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calcStreak, lastNDays, todayKey } from "../utils/dateHelpers.js";
import { isValidObjectId } from "../middleware/validate.js";

const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 2000;

// Chat history comes from the client: keep only well-formed user/assistant
// turns so it cannot inject system messages or blow up the prompt size.
export const sanitizeHistory = (history, question = "") => {
  if (!Array.isArray(history)) return [];
  const turns = history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant" || m.role === "model") &&
        typeof (m.content ?? m.text) === "string",
    )
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content ?? m.text).slice(0, MAX_HISTORY_CHARS),
    }))
    .filter((m) => m.content.trim());

  // The current question is sent separately; drop it if the client also
  // appended it to the history.
  const last = turns.at(-1);
  if (last?.role === "user" && last.content.trim() === question.trim()) {
    turns.pop();
  }
  return turns.slice(-MAX_HISTORY_MESSAGES);
};

const cleanText = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// AI output is untrusted: coerce suggestions into values the Habit model
// accepts so "Add habit" does not fail on an invented category.
export const normalizeSuggestions = (items) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const category = HABIT_CATEGORIES.find(
        (c) => c.toLowerCase() === cleanText(item.category, 40).toLowerCase(),
      );
      return {
        name: cleanText(item.name, 80),
        description: cleanText(item.description, 300),
        frequency: item.frequency === "weekly" ? "weekly" : "daily",
        category: category || "Other",
        icon: cleanText(item.icon, 8),
        reason: cleanText(item.reason, 300),
      };
    })
    .filter((item) => item.name);

const openRouterUrl = `${String(env.aiBaseUrl || "").replace(/\/+$/, "")}/chat/completions`;
const geminiUrl = env.geminiApiKey
  ? `https://generativelanguage.googleapis.com/v1beta/${String(env.geminiModel || "models/gemini-2.5-flash").replace(/^\/+/, "")}:generateContent`
  : "";

const hasOpenRouterKey = () => Boolean(env.aiApiKey?.trim());
const hasGeminiKey = () => Boolean(env.geminiApiKey?.trim());

const openRouterHeaders = {
  ...(env.aiApiKey ? { Authorization: `Bearer ${env.aiApiKey}` } : {}),
  ...(env.clientUrls[0] ? { "HTTP-Referer": env.clientUrls[0] } : {}),
  "X-Title": "AI Habit Tracker",
};

const extractGeminiText = (data) =>
  (data?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();

const extractStreamText = (chunkText) => {
  let out = "";
  for (const line of String(chunkText).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") out += delta;
    } catch {
      continue;
    }
  }
  return out.trim();
};

const callGemini = async (prompt, systemInstruction, history = []) => {
  if (!hasGeminiKey()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const formattedHistory = (history || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || m.text || "" }],
    }));

    const body = {
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 900,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(geminiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`Gemini request failed with ${response.status}`);
      return null;
    }

    try {
      const data = await response.json();
      const text = extractGeminiText(data);
      return text || null;
    } catch {
      return null;
    }
  } catch (error) {
    console.warn("AI provider call failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const callOpenRouter = async (prompt, systemInstruction, history = []) => {
  if (!hasOpenRouterKey()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const formattedHistory = (history || []).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content || m.text || "",
    }));

    const response = await fetch(openRouterUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...openRouterHeaders,
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          ...formattedHistory,
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 900,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.warn(`OpenRouter request failed with ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    if (contentType.includes("text/event-stream") || rawText.includes("data:")) {
      const streamed = extractStreamText(rawText);
      if (streamed) return streamed;
    }

    try {
      const data = JSON.parse(rawText);
      const text =
        typeof data?.choices?.[0]?.message?.content === "string"
          ? data.choices[0].message.content.trim()
          : "";
      return text || null;
    } catch {
      return null;
    }
  } catch (error) {
    console.warn("AI provider call failed:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const callAi = async (prompt, fallback, systemInstruction, history = []) => {
  const providers = [callGemini, callOpenRouter];

  for (const provider of providers) {
    const content = await provider(prompt, systemInstruction, history);
    if (content) return content;
  }

  return fallback;
};

const uniqueByName = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.name || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fallbackSuggestions = ({ goals = "", productiveTime = "", struggles = "" }) => {
  const text = `${goals} ${productiveTime} ${struggles}`.toLowerCase();

  const candidates = [
    {
      name: "5-minute daily reset",
      description: "Use a tiny daily reset to keep momentum when the day feels messy.",
      frequency: "daily",
      category: "Mindfulness",
      icon: "🧘",
      reason: "Low-friction habits are easier to repeat when you are busy or tired.",
    },
    {
      name: "Morning walk",
      description: "Take a short walk before breakfast to anchor your day.",
      frequency: "daily",
      category: "Fitness",
      icon: "🚶",
      reason: "It pairs well with energy-building goals and helps create a reliable routine.",
    },
    {
      name: "Read 10 pages",
      description: "Keep a book nearby and read a small amount each day.",
      frequency: "daily",
      category: "Learning",
      icon: "📚",
      reason: "Short learning habits build consistency without needing a long time block.",
    },
    {
      name: "Phone-free first 30 minutes",
      description: "Delay social apps until after your first intentional task.",
      frequency: "daily",
      category: "Productivity",
      icon: "📵",
      reason: "This reduces early-day distraction and protects the time you said is most valuable.",
    },
    {
      name: "Weekly reflection",
      description: "Review your week and pick one thing to improve next week.",
      frequency: "weekly",
      category: "Mindfulness",
      icon: "📝",
      reason: "Helpful when you want to stay aligned with your goals over the long term.",
    },
  ];

  const picks = [];
  const addIfMatch = (matched, item) => {
    if (matched && !picks.some((p) => p.name === item.name)) picks.push(item);
  };

  addIfMatch(/fit|exercise|workout|run|gym|move/.test(text), candidates[1]);
  addIfMatch(/read|book|study|learn/.test(text), candidates[2]);
  addIfMatch(/phone|screen|scroll|social/.test(text), candidates[3]);
  addIfMatch(/reflect|journal|mindful|stress|focus/.test(text), candidates[0]);
  addIfMatch(/productiv|work|ship|build|project/.test(text), candidates[4]);

  for (const item of candidates) {
    if (picks.length >= 3) break;
    if (!picks.some((p) => p.name === item.name)) picks.push(item);
  }

  return uniqueByName(picks).slice(0, 3);
};

const buildSnapshot = async (userId) => {
  const [habits, logs] = await Promise.all([
    Habit.find({ userId }).sort({ order: 1, createdAt: 1 }).lean(),
    HabitLog.find({ userId }).sort({ completedDate: 1 }).lean(),
  ]);

  const activeHabits = habits.filter((habit) => !habit.isArchived);
  const last7 = lastNDays(7);
  const last14 = lastNDays(14);
  const last30 = lastNDays(30);
  const last90 = lastNDays(90);

  const last7Logs = logs.filter((log) => last7.includes(log.completedDate));
  const last14Logs = logs.filter((log) => last14.includes(log.completedDate));
  const last30Logs = logs.filter((log) => last30.includes(log.completedDate));
  const last90Logs = logs.filter((log) => last90.includes(log.completedDate));

  const habitSummaries = activeHabits.map((habit) => {
    const habitLogs = logs.filter(
      (log) => String(log.habitId) === String(habit._id),
    );
    const habitLogs7 = last7Logs.filter(
      (log) => String(log.habitId) === String(habit._id),
    );
    const habitLogs30 = last30Logs.filter(
      (log) => String(log.habitId) === String(habit._id),
    );
    const streak = calcStreak(habitLogs.map((log) => log.completedDate));
    return {
      habit,
      completions7d: habitLogs7.length,
      completions30d: habitLogs30.length,
      totalCompletions: habitLogs.length,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      lastCompleted: habitLogs.at(-1)?.completedDate || null,
    };
  });

  const topHabit =
    [...habitSummaries].sort(
      (a, b) => b.completions7d - a.completions7d || b.currentStreak - a.currentStreak,
    )[0] || null;

  const categoryCounts = new Map();
  for (const log of last30Logs) {
    const habit = habits.find((item) => String(item._id) === String(log.habitId));
    if (!habit || habit.isArchived) continue;
    categoryCounts.set(habit.category, (categoryCounts.get(habit.category) || 0) + 1);
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const dayCounts = Object.fromEntries(
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => [day, 0]),
  );
  for (const log of last30Logs) {
    const day = new Date(`${log.completedDate}T00:00:00.000Z`).toLocaleDateString(
      "en-US",
      { weekday: "short", timeZone: "UTC" },
    );
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }

  const mostActiveDay =
    Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    habits,
    activeHabits,
    logs,
    last7,
    last14,
    last30,
    last90,
    last7Logs,
    last14Logs,
    last30Logs,
    last90Logs,
    habitSummaries,
    topHabit,
    topCategory,
    mostActiveDay,
    completedToday: logs.filter((log) => log.completedDate === todayKey()),
  };
};

const buildWeeklyFallback = (snapshot) => {
  const activeCount = snapshot.activeHabits.length;
  const completions = snapshot.last7Logs.length;
  const completionRate = activeCount
    ? Math.round((completions / (activeCount * 7)) * 100)
    : 0;
  const topHabit = snapshot.topHabit;
  const topCategory = snapshot.topCategory?.[0]
    ? `${snapshot.topCategory[0]} (${snapshot.topCategory[1]})`
    : "no clear winner yet";
  const mostActiveDay = snapshot.mostActiveDay?.[0]
    ? `${snapshot.mostActiveDay[0]} (${snapshot.mostActiveDay[1]})`
    : "no clear trend yet";

  return `# Your weekly recap

- **${completions}** completions across **${activeCount}** active habits this week.
- Overall completion rate: **${completionRate}%**.
- Best habit: **${topHabit?.habit?.name || "—"}** (${topHabit?.completions7d || 0}/7).
- Strongest category: **${topCategory}**.
- Best day: **${mostActiveDay}**.

## What to focus on next

1. Keep the habit that is already working and make it easier to repeat.
2. Shrink the weakest habit to a smaller action you can still complete on busy days.
3. Protect your strongest day with a pre-planned routine.

You’re building momentum — small consistency beats perfect weeks.`;
};

const buildMorningFallback = (user, snapshot) => {
  const firstName = user?.name?.split(" ")[0] || "there";
  const habit =
    snapshot.topHabit?.habit?.name || snapshot.activeHabits[0]?.name || "your first habit";
  const streak = snapshot.topHabit?.currentStreak || 0;

  return `Good morning, ${firstName}! You’ve already got **${streak} day${streak === 1 ? "" : "s"}** on **${habit}**, which is a strong anchor for today.

Pick one small win early, then let that momentum carry into the rest of the day.`;
};

const buildRecoveryFallback = (habit, snapshot) => {
  const streak = snapshot.habitSummaries.find(
    (item) => String(item.habit._id) === String(habit._id),
  );
  const longest = streak?.longestStreak || 0;

  return `## 3-day comeback plan for **${habit.name}**

**Day 1:** Do the tiniest version possible — enough to restart the routine.

**Day 2:** Repeat the habit at a relaxed pace and focus on showing up again.

**Day 3:** Return to your normal version of the habit and keep the friction low.

You’ve had a best streak of **${longest} days**, so the habit already fits your life. The goal now is to reduce friction, not rebuild from scratch.`;
};

const buildChatFallback = (question, snapshot) => {
  const q = question.toLowerCase();
  const topCategory = snapshot.topCategory?.[0] || "no standout category yet";
  const topHabit = snapshot.topHabit?.habit?.name || "one of your habits";
  const topHabitRate = snapshot.topHabit
    ? `${snapshot.topHabit.completions30d} completions in the last 30 days`
    : "no recent completion data yet";
  const bestDay = snapshot.mostActiveDay?.[0] || "no clear best day yet";

  if (q.includes("most consistent") || q.includes("best day")) {
    return `Your strongest day is **${bestDay}** based on your recent completions. If you want to improve consistency, protect that day with a simple routine and pre-plan the habit you usually miss.`;
  }

  if (q.includes("best performing category") || q.includes("category")) {
    return `**${topCategory}** is currently your strongest category. The habit driving that trend is **${topHabit}**, with **${topHabitRate}**.`;
  }

  if (q.includes("failing") || q.includes("why") || q.includes("exercise")) {
    return `The pattern is usually friction, not motivation. For **${topHabit}**, try shrinking the first step, keeping the setup visible, and making the habit easier on low-energy days.`;
  }

  return `Looking at your recent data, you’re building momentum in **${topCategory}** and your strongest pattern is around **${bestDay}**. Ask me about a specific habit, category, or day of the week and I’ll narrow it down.`;
};

export const getMorningMotivation = asyncHandler(async (req, res) => {
  const snapshot = await buildSnapshot(req.user._id);
  const fallback = buildMorningFallback(req.user, snapshot);
  const prompt = `Write a short, warm morning motivation message in markdown for ${req.user.name}. Use the user's habit data below. Keep it under 120 words and include one specific win and one small focus for today.\n\n${JSON.stringify(
    {
      activeHabits: snapshot.activeHabits.length,
      topHabit: snapshot.topHabit?.habit?.name || null,
      topHabitStreak: snapshot.topHabit?.currentStreak || 0,
      recentCompletions: snapshot.last7Logs.length,
      bestDay: snapshot.mostActiveDay?.[0] || null,
    },
    null,
    2,
  )}`;

  const content = await callAi(
    prompt,
    fallback,
    "You write concise, encouraging habit-coaching messages in markdown.",
  );
  res.json({ content });
});

export const generateWeeklyReport = asyncHandler(async (req, res) => {
  const snapshot = await buildSnapshot(req.user._id);
  const fallback = buildWeeklyFallback(snapshot);
  const prompt = `Create a concise weekly habit report in markdown for the user below. Use headings and bullets. Include: what went well, what slipped, a pattern to watch, and 2 actionable next steps. Keep it practical and encouraging.\n\nUser: ${req.user.name}\n\nData summary:\n${JSON.stringify(
    {
      activeHabits: snapshot.activeHabits.length,
      completionsLast7d: snapshot.last7Logs.length,
      completionsLast30d: snapshot.last30Logs.length,
      topHabit: snapshot.topHabit
        ? {
            name: snapshot.topHabit.habit.name,
            completions7d: snapshot.topHabit.completions7d,
            currentStreak: snapshot.topHabit.currentStreak,
            longestStreak: snapshot.topHabit.longestStreak,
          }
        : null,
      topCategory: snapshot.topCategory,
      bestDay: snapshot.mostActiveDay,
      habits: snapshot.habitSummaries.map((item) => ({
        name: item.habit.name,
        category: item.habit.category,
        completions7d: item.completions7d,
        currentStreak: item.currentStreak,
        longestStreak: item.longestStreak,
      })),
    },
    null,
    2,
  )}`;

  const content = await callAi(
    prompt,
    fallback,
    "You are a thoughtful habit coach. Return markdown only.",
  );
  res.json({ content });
});

export const suggestHabits = asyncHandler(async (req, res) => {
  const { goals = "", productiveTime = "", struggles = "" } = req.body || {};
  const normalizedGoals = String(goals ?? "").trim();
  const normalizedProductiveTime = String(productiveTime ?? "").trim();
  const normalizedStruggles = String(struggles ?? "").trim();

  if (!normalizedGoals || !normalizedProductiveTime || !normalizedStruggles) {
    throw new AppError("goals, productiveTime and struggles are required", 400);
  }

  const snapshot = await buildSnapshot(req.user._id);
  const fallback = fallbackSuggestions({
    goals: normalizedGoals,
    productiveTime: normalizedProductiveTime,
    struggles: normalizedStruggles,
  });

  const prompt = `Suggest 3 habit ideas as JSON only with the shape [{"name":"","description":"","frequency":"daily|weekly","category":"","icon":"","reason":""}].\n\nUse the user's goals, productive time, and struggles. Make each idea realistic, specific, and different from habits the user already has. Keep the suggestions short and practical.\n\nUser goals: ${goals}\nMost productive time: ${productiveTime}\nCurrent struggles: ${struggles}\nExisting habits: ${snapshot.habitSummaries
    .map((item) => `${item.habit.name} (${item.habit.category})`)
    .join("; ") || "none"}`;

  const text = await callAi(
    prompt,
    JSON.stringify(fallback),
    "You are a structured habit-planning assistant. Return JSON only.",
  );

  let suggestions = fallback;
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const candidates = normalizeSuggestions(
      Array.isArray(parsed) ? parsed : parsed?.suggestions,
    );
    if (candidates.length) suggestions = candidates;
  } catch {
    suggestions = fallback;
  }

  res.json({ suggestions: uniqueByName(suggestions).slice(0, 3) });
});

export const generateRecoveryPlan = asyncHandler(async (req, res) => {
  const { habitId } = req.body || {};
  const normalizedHabitId = String(habitId ?? "").trim();

  if (!normalizedHabitId || !isValidObjectId(normalizedHabitId)) {
    throw new AppError("Valid habitId is required", 400);
  }

  const habit = await Habit.findOne({ _id: normalizedHabitId, userId: req.user._id }).lean();
  if (!habit) {
    throw new AppError("Habit not found", 404);
  }

  const snapshot = await buildSnapshot(req.user._id);
  const fallback = buildRecoveryFallback(habit, snapshot);
  const habitSummary = snapshot.habitSummaries.find(
    (item) => String(item.habit._id) === String(normalizedHabitId),
  );

  const prompt = `Write a markdown 3-day comeback plan for the habit below. Keep it gentle, practical, and brief. Include a short explanation of why the habit likely broke and 3 specific next steps.\n\nHabit: ${habit.name}\nCategory: ${habit.category}\nFrequency: ${habit.frequency}\nCurrent streak: ${habitSummary?.currentStreak || 0}\nLongest streak: ${habitSummary?.longestStreak || 0}\nRecent completions in 30 days: ${habitSummary?.completions30d || 0}\nLast completed: ${habitSummary?.lastCompleted || "never"}`;

  const content = await callAi(
    prompt,
    fallback,
    "You are a supportive comeback coach. Return markdown only.",
  );
  res.json({ content });
});

export const chatWithHabits = asyncHandler(async (req, res) => {
  const { question = "", history = [] } = req.body || {};
  const normalizedQuestion = String(question ?? "").trim().slice(0, 2000);

  if (!normalizedQuestion) {
    throw new AppError("question is required", 400);
  }

  const snapshot = await buildSnapshot(req.user._id);
  const fallback = buildChatFallback(normalizedQuestion, snapshot);
  const prompt = `Answer the user's question using their habit data. Keep the response conversational, markdown-friendly, and grounded in the data. If the question asks for a recommendation, include one clear suggestion.\n\nUser question: ${normalizedQuestion}\n\nData summary:\n${JSON.stringify(
    {
      activeHabits: snapshot.activeHabits.length,
      topHabit: snapshot.topHabit
        ? {
            name: snapshot.topHabit.habit.name,
            completions30d: snapshot.topHabit.completions30d,
            currentStreak: snapshot.topHabit.currentStreak,
            longestStreak: snapshot.topHabit.longestStreak,
          }
        : null,
      topCategory: snapshot.topCategory,
      bestDay: snapshot.mostActiveDay,
      habits: snapshot.habitSummaries.map((item) => ({
        name: item.habit.name,
        category: item.habit.category,
        completions30d: item.completions30d,
        currentStreak: item.currentStreak,
        longestStreak: item.longestStreak,
      })),
    },
    null,
    2,
  )}`;

  const content = await callAi(
    prompt,
    fallback,
    "You are a helpful habit-analysis assistant. Return markdown only.",
    sanitizeHistory(history, normalizedQuestion),
  );
  res.json({ content });
});

