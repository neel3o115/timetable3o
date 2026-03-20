import express from "express";

import shareController from "../controllers/ShareController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/:id", requireAuth, shareController.create.bind(shareController));
router.get("/link/:token", optionalAuth, shareController.getByToken.bind(shareController));
router.patch("/link/:token", optionalAuth, shareController.updateByToken.bind(shareController));

export default router;
