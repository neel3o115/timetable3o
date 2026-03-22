import express from "express";

import publishedExportController from "../controllers/PublishedExportController.js";

const router = express.Router();

router.post("/sheets/:id", publishedExportController.sheets.bind(publishedExportController));
router.post("/calendar/:id", publishedExportController.calendar.bind(publishedExportController));

export default router;
