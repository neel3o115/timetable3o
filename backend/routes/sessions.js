import express from "express";

import sessionController from "../controllers/SessionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/claim", requireAuth, sessionController.claim.bind(sessionController));

export default router;
