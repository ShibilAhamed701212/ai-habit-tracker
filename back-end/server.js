import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { validateEnv, env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import habitRoutes from "./routes/habit.js";
import logRoutes from "./routes/log.js";
import { securityMiddleware } from "./middleware/security.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

validateEnv();

const app = express();

app.disable("x-powered-by");
app.use(securityMiddleware);

const allowedOrigins = env.clientUrls;

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, try again later" },
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/logs", logRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to start server:", message);
    process.exit(1);
  }
};

start();
