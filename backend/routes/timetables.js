import express from "express";

import timetableController from "../controllers/TimetableController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, timetableController.list.bind(timetableController));
router.post("/", requireAuth, timetableController.create.bind(timetableController));
router.get("/:id", requireAuth, timetableController.get.bind(timetableController));
router.patch("/:id", requireAuth, timetableController.update.bind(timetableController));
router.delete("/:id", requireAuth, timetableController.delete.bind(timetableController));

export default router;
