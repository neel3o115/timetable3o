import express from "express";

import publishedTimetableController from "../controllers/PublishedTimetableController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/publish", optionalAuth, publishedTimetableController.publish.bind(publishedTimetableController));
router.get("/:id", publishedTimetableController.get.bind(publishedTimetableController));
router.delete("/:id", requireAuth, publishedTimetableController.delete.bind(publishedTimetableController));

export default router;
