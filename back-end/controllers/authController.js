import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isEmail } from "../middleware/validate.js";
import { env } from "../config/env.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email ||
    !password
  ) {
    throw new AppError("Name, email and password are required", 400);
  }
  if (!isEmail(email)) {
    throw new AppError("Invalid email address", 400);
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }
  if (password.length > 128) {
    throw new AppError("Password is too long", 400);
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    throw new AppError("Email already registered", 400);
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    avatar: name.trim().charAt(0).toUpperCase(),
  });

  res.status(201).json({ user, token: signToken(user._id) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    throw new AppError("Email and password required", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password",
  );

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  res.json({ user, token: signToken(user._id) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, morningMotivation } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new AppError("Name cannot be empty", 400);
    }
    user.name = name.trim();
    user.avatar = name.trim().charAt(0).toUpperCase();
  }
  if (morningMotivation !== undefined) {
    user.morningMotivation = Boolean(morningMotivation);
  }

  await user.save();
  res.json({ user });
});
