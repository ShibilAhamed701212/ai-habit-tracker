import { validateEnv, env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import app from "./app.js";

const start = async () => {
  try {
    validateEnv();
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
