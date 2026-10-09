import { Router } from "express";
import auth from "@/routes/auth.js";
import leaderBoard from "@/routes/leaderboard.js";
import scans from "@/routes/scans.js";

const router = Router();

router.use("/auth", auth);
router.use("/leaderboard", leaderBoard);
router.use("/scans", scans);

export default router;