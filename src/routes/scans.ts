import { Router } from "express";
import { createScan, confirmScan, listScans } from "@/controller/scans.js";
import { authenticate } from "@/middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", listScans);
router.post("/", createScan);
router.patch("/:id/confirm", confirmScan);

export default router;