import { Router } from "express";
import { getLeaderboard } from "@/controller/leaderboard.js";
import { authenticate } from "@/middleware/auth.js";

const router = Router();

router.get("/", authenticate, getLeaderboard);

export default router;
