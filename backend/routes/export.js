import express from "express";

import legacyExportController from "../controllers/LegacyExportController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/:id/ics", optionalAuth, legacyExportController.ics.bind(legacyExportController));
router.get("/:id/csv", optionalAuth, legacyExportController.csv.bind(legacyExportController));
router.get("/:id/xlsx", requireAuth, legacyExportController.xlsx.bind(legacyExportController));

export default router;
