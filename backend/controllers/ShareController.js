import shareService from "../services/ShareService.js";
import { BaseController } from "./BaseController.js";

class ShareController extends BaseController {
  async create(req, res) {
    try {
      return res.json(await shareService.createShareToken({
        id: req.params.id,
        userId: req.user._id,
        permission: req.body?.permission
      }));
    } catch (error) {
      return this.handleError(res, error, "Unable to create share link");
    }
  }

  async getByToken(req, res) {
    try {
      return res.json(await shareService.getSharedTimetable(req.params.token));
    } catch (error) {
      return this.handleError(res, error, "Unable to fetch shared timetable");
    }
  }

  async updateByToken(req, res) {
    try {
      return res.json(await shareService.updateSharedTimetable(req.params.token, req.body || {}));
    } catch (error) {
      return this.handleError(res, error, "Unable to update shared timetable");
    }
  }
}

export default new ShareController();
