import { Router } from "express";
import { login, register, googleLogin, logout } from "@/controller/auth.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin);
router.post("/logout", logout);

export default router;
