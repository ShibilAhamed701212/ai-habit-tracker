import dotenv from "dotenv";
dotenv.config({ override: true });

const REQUIRED = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 8000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  aiBaseUrl:
    process.env.OPENROUTER_BASE_URL ||
    process.env.NVIDIA_BASE_URL ||
    "https://openrouter.ai/api/v1",
  aiApiKey: process.env.OPENROUTER_API_KEY || process.env.NVIDIA_API_KEY || "",
  aiModel:
    process.env.OPENROUTER_MODEL ||
    process.env.NVIDIA_MODEL ||
    "minimaxai/minimax-m2.7",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "models/gemini-2.5-flash",
  clientUrls: (process.env.CLIENT_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: process.env.NODE_ENV === "production",
};
