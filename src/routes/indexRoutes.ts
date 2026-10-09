import { Router } from "express";
import auth from "@/routes/auth.js";
import leaderBoard from "@/routes/leaderboard.js";

const router = Router();

router.use("/auth", auth);
router.use("/leaderboard", leaderBoard);

export default router;
