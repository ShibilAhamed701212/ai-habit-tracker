import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidObjectId } from "../middleware/validate.js";

const ALLOWED_FIELDS = [
  "name",
  "description",
  "category",
  "frequency",
  "targetDays",
  "color",
  "icon",
  "order",
];

export const getHabits = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.includeArchived !== "true") filter.isArchived = false;

  const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });
  res.json(habits);
});

export const createHabit = asyncHandler(async (req, res) => {
  const { name, description, category, frequency, targetDays, color, icon } =
    req.body;

  if (!name?.trim()) {
    throw new AppError("Habit name is required", 400);
  }

  const count = await Habit.countDocuments({ userId: req.user._id });
  const habit = await Habit.create({
    userId: req.user._id,
    name: name.trim(),
    description: description?.trim?.() ?? description,
    category,
    frequency,
    targetDays,
    color,
    icon,
    order: count,
  });

  res.status(201).json(habit);
});

export const updateHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!habit) {
    throw new AppError("Habit not found", 404);
  }

  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      habit[field] =
        field === "name" ? req.body[field]?.trim?.() ?? req.body[field] : req.body[field];
    }
  }

  await habit.save();
  res.json(habit);
});

export const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!habit) {
    throw new AppError("Habit not found", 404);
  }

  await HabitLog.deleteMany({ habitId: habit._id, userId: req.user._id });
  res.json({ message: "Habit deleted" });
});

export const archiveHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!habit) {
    throw new AppError("Habit not found", 404);
  }

  habit.isArchived = !habit.isArchived;
  await habit.save();
  res.json(habit);
});

export const reorderHabits = asyncHandler(async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    throw new AppError("order must be a non-empty array", 400);
  }

  if (!order.every((id) => isValidObjectId(id))) {
    throw new AppError("order contains invalid habit ids", 400);
  }

  await Promise.all(
    order.map((id, idx) =>
      Habit.updateOne(
        { _id: id, userId: req.user._id },
        { $set: { order: idx } },
      ),
    ),
  );

  res.json({ message: "Reordered" });
});
