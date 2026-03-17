import saveTimetableService from "../services/SaveTimetableService.js";
import { BaseController } from "./BaseController.js";

class SaveTimetableController extends BaseController {
  async save(req, res) {
    try {
      return res.json(await saveTimetableService.save({
        userId: req.user._id,
        sessionId: req.body?.session_id,
        solverResult: req.body?.solver_result,
        title: req.body?.title
      }));
    } catch (error) {
      return this.handleError(res, error, "Failed to save timetable");
    }
  }
}

export default new SaveTimetableController();
