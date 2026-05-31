import express from "express";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
  reorderHabits,
} from "../controllers/habitController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.get("/", getHabits);
router.post("/", createHabit);
router.put("/reorder", reorderHabits);
router.put("/:id/archive", validateObjectId("id"), archiveHabit);
router.put("/:id", validateObjectId("id"), updateHabit);
router.delete("/:id", validateObjectId("id"), deleteHabit);

export default router;
