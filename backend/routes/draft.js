import express from "express";

import draftController from "../controllers/DraftController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", optionalAuth, draftController.createDraft.bind(draftController));
router.get("/:id", optionalAuth, draftController.getDraft.bind(draftController));
router.patch("/:id", optionalAuth, draftController.updateDraft.bind(draftController));
router.post("/:id/solve", optionalAuth, draftController.solveDraft.bind(draftController));

export default router;
