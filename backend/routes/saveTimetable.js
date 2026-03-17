import express from "express";

import saveTimetableController from "../controllers/SaveTimetableController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, saveTimetableController.save.bind(saveTimetableController));

export default router;
