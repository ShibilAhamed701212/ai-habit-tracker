import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const validateObjectId =
  (paramName = "id") =>
  (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !isValidObjectId(id)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }
    next();
  };

export const parseDateKey = (value, fieldName = "date") => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) {
    throw new AppError(`${fieldName} must be YYYY-MM-DD`, 400);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return value;
};

/** @param {string} value @param {string} [fieldName] @returns {string} */
export const requireDateKey = (value, fieldName = "date") => {
  const key = parseDateKey(value, fieldName);
  if (!key) {
    throw new AppError(`${fieldName} is required (YYYY-MM-DD)`, 400);
  }
  return key;
};

export const isEmail = (email) =>
  typeof email === "string" &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
