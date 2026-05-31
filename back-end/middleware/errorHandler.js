import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const handleCastError = () => new AppError("Resource not found", 404);

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  return new AppError(`${field} already in use`, 400);
};

const handleValidationError = (err) => {
  const message = Object.values(err.errors || {})
    .map((e) => e.message)
    .join(". ");
  return new AppError(message || "Validation failed", 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error("Unexpected error:", err);
  res.status(500).json({ message: "Something went wrong" });
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.name === "CastError") error = handleCastError();
  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === "ValidationError") error = handleValidationError(err);
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    error = new AppError("Not authorized", 401);
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (env.isProd) sendErrorProd(error, res);
  else sendErrorDev(error, res);
};
