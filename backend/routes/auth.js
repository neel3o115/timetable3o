import express from "express";

import authController from "../controllers/AuthController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", authController.signup.bind(authController));
router.post("/login", authController.login.bind(authController));
router.get("/session", optionalAuth, authController.session.bind(authController));
router.post("/logout", authController.logout.bind(authController));

export default router;
