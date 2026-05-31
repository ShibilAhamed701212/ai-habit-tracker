import express from "express";
import {
  chatWithHabits,
  generateRecoveryPlan,
  generateWeeklyReport,
  getMorningMotivation,
  suggestHabits,
} from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/morning", getMorningMotivation);
router.post("/weekly-report", generateWeeklyReport);
router.post("/suggest-habits", suggestHabits);
router.post("/recovery-plan", generateRecoveryPlan);
router.post("/chat", chatWithHabits);

export default router;

