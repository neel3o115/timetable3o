import timetableService from "../services/TimetableService.js";
import { BaseController } from "./BaseController.js";

class TimetableController extends BaseController {
  async list(req, res) {
    try {
      return res.json(await timetableService.listUserTimetables(req.user._id));
    } catch (error) {
      return this.handleError(res, error, "Unable to load timetables");
    }
  }

  async create(req, res) {
    try {
      return res.json(await timetableService.createTimetableFromSession({
        userId: req.user._id,
        title: req.body?.title,
        sessionId: req.body?.session_id
      }));
    } catch (error) {
      return this.handleError(res, error, "Unable to create timetable");
    }
  }

  async get(req, res) {
    try {
      return res.json(await timetableService.getTimetable({ id: req.params.id, userId: req.user._id }));
    } catch (error) {
      return this.handleError(res, error, "Unable to load timetable");
    }
  }

  async update(req, res) {
    try {
      return res.json(await timetableService.updateTimetable({ id: req.params.id, userId: req.user._id, updates: req.body || {} }));
    } catch (error) {
      return this.handleError(res, error, "Unable to update timetable");
    }
  }

  async delete(req, res) {
    try {
      return res.json(await timetableService.deleteOwnedItem({ id: req.params.id, userId: req.user._id }));
    } catch (error) {
      return this.handleError(res, error, "Unable to delete timetable");
    }
  }
}

export default new TimetableController();
