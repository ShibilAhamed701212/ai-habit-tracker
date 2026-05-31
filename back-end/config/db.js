import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  const conn = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
};
