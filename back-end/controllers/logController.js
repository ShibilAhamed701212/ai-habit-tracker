import HabitLog from "../models/HabitLog.js";
import Habit from "../models/Habit.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidObjectId,
  parseDateKey,
  requireDateKey,
} from "../middleware/validate.js";
import {
  todayKey,
  lastNDays,
  last90Days,
  calcStreak,
} from "../utils/dateHelpers.js";

/** @param {string} habitId @param {import("mongoose").Types.ObjectId} userId */
const findOwnedHabit = async (habitId, userId) => {
  if (!habitId || !isValidObjectId(habitId)) {
    throw new AppError("Valid habitId is required", 400);
  }
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new AppError("Habit not found", 404);
  }
  return habit;
};

export const markComplete = asyncHandler(async (req, res) => {
  const { habitId, date } = req.body;
  const completedDate = parseDateKey(date, "date") ?? todayKey();

  await findOwnedHabit(habitId, req.user._id);

  const log = await HabitLog.findOneAndUpdate(
    { userId: req.user._id, habitId, completedDate },
    { $setOnInsert: { userId: req.user._id, habitId, completedDate } },
    { upsert: true, new: true },
  );

  res.status(201).json(log);
});

export const unmarkComplete = asyncHandler(async (req, res) => {
  const { habitId, date } = req.body;
  const completedDate = parseDateKey(date, "date") ?? todayKey();

  await findOwnedHabit(habitId, req.user._id);

  await HabitLog.findOneAndDelete({
    userId: req.user._id,
    habitId,
    completedDate,
  });

  res.json({ message: "Unmarked" });
});

export const getToday = asyncHandler(async (req, res) => {
  const logs = await HabitLog.find({
    userId: req.user._id,
    completedDate: todayKey(),
  });
  res.json(logs);
});

export const getRange = asyncHandler(async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    throw new AppError(
      "start and end query params are required (YYYY-MM-DD)",
      400,
    );
  }

  const startKey = requireDateKey(String(start), "start");
  const endKey = requireDateKey(String(end), "end");

  if (startKey > endKey) {
    throw new AppError("start must be on or before end", 400);
  }

  const logs = await HabitLog.find({
    userId: req.user._id,
    completedDate: { $gte: startKey, $lte: endKey },
  });

  res.json(logs);
});

export const getHeatmap = asyncHandler(async (req, res) => {
  const days = last90Days();
  const logs = await HabitLog.find({
    userId: req.user._id,
    completedDate: { $gte: days[0], $lte: days[days.length - 1] },
  });

  const counts = Object.fromEntries(days.map((d) => [d, 0]));
  for (const log of logs) {
    counts[log.completedDate] = (counts[log.completedDate] || 0) + 1;
  }

  res.json(days.map((date) => ({ date, count: counts[date] })));
});

export const getHabitStats = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.habitId, req.user._id);

  const logs = await HabitLog.find({
    userId: req.user._id,
    habitId: habit._id,
  }).sort({ completedDate: -1 });

  const dateKeys = logs.map((l) => l.completedDate);
  const { current, longest } = calcStreak(dateKeys);

  const createdKey = habit.createdAt.toISOString().slice(0, 10);
  const today = todayKey();
  const start = new Date(`${createdKey}T00:00:00.000Z`);
  const end = new Date(`${today}T00:00:00.000Z`);
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const completionRate = Math.round((logs.length / totalDays) * 100);

  /** @type {Record<string, number>} */
  const monthly = {};
  for (const log of logs) {
    const month = log.completedDate.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + 1;
  }

  res.json({
    habit,
    totalCompletions: logs.length,
    currentStreak: current,
    longestStreak: longest,
    completionRate,
    monthly,
  });
});

export const getAllStats = asyncHandler(async (req, res) => {
  const habits = await Habit.find({
    userId: req.user._id,
    isArchived: false,
  });

  const days = lastNDays(30);
  const logs = await HabitLog.find({
    userId: req.user._id,
    completedDate: { $gte: days[0], $lte: days[days.length - 1] },
  });

  const perHabit = habits.map((h) => {
    const hLogs = logs.filter((l) => String(l.habitId) === String(h._id));
    const keys = hLogs.map((l) => l.completedDate).sort().reverse();
    const { current, longest } = calcStreak(keys);
    return {
      habitId: h._id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      category: h.category,
      completions30d: hLogs.length,
      currentStreak: current,
      longestStreak: longest,
    };
  });

  res.json({ perHabit, days });
});
