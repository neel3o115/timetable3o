import { BaseController } from "./BaseController.js";
import draftService from "../services/draftService.js";

class DraftController extends BaseController {
  async createDraft(req, res) {
    try {
      const draft = await draftService.createDraft({
        userId: req.user?.id || req.user?._id || null,
        input: req.body || {}
      });
      return res.status(201).json({ draft });
    } catch (error) {
      return this.handleError(res, error, "Unexpected draft error");
    }
  }

  async getDraft(req, res) {
    try {
      const draft = await draftService.getDraft({
        draftId: req.params.id,
        userId: req.user?.id || req.user?._id || null
      });
      return res.json({ draft });
    } catch (error) {
      return this.handleError(res, error, "Unexpected draft error");
    }
  }

  async updateDraft(req, res) {
    try {
      const draft = await draftService.updateDraft({
        draftId: req.params.id,
        userId: req.user?.id || req.user?._id || null,
        updates: req.body || {}
      });
      return res.json({ draft });
    } catch (error) {
      return this.handleError(res, error, "Unexpected draft error");
    }
  }

  async solveDraft(req, res) {
    try {
      const { draft, result, metadata } = await draftService.solveDraft({
        draftId: req.params.id,
        userId: req.user?.id || req.user?._id || null
      });

      if (result.status === "POSSIBLE") {
        return res.json({
          status: "POSSIBLE",
          draft_id: draft._id,
          timetable: result.timetable,
          grid: result.grid,
          time: result.time,
          metadata
        });
      }

      return res.status(400).json({
        status: "NOT_POSSIBLE",
        reasons: result.reasons || [],
        debug: result.debug || null,
        metadata
      });
    } catch (error) {
      return this.handleError(res, error, "Unexpected draft error");
    }
  }
}

export default new DraftController();
