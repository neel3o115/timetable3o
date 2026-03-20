import publishedTimetableService from "../services/PublishedTimetableService.js";
import timetableService from "../services/TimetableService.js";
import { BaseController } from "./BaseController.js";

class PublishedTimetableController extends BaseController {
  async publish(req, res) {
    try {
      const result = await publishedTimetableService.publish(req.body || {}, req.user);
      return res.status(201).json(result);
    } catch (error) {
      const details = error.details && Array.isArray(error.details) ? { reasons: error.details } : {};
      const handled = this.handleError.bind(this);
      if (error.status && error.code === "ERROR" && details.reasons) {
        return res.status(error.status).json({ status: error.code, message: error.message, ...details });
      }
      return handled(res, error, "Unable to publish timetable");
    }
  }

  async get(req, res) {
    try {
      return res.json(await publishedTimetableService.getPublished(req.params.id));
    } catch (error) {
      return this.handleError(res, error, "Unable to fetch published timetable");
    }
  }

  async delete(req, res) {
    try {
      return res.json(await timetableService.deleteOwnedItem({ id: req.params.id, userId: req.user?._id || req.user?.id }));
    } catch (error) {
      return this.handleError(res, error, "Unable to delete timetable");
    }
  }
}

export default new PublishedTimetableController();
