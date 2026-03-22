import publishedExportService from "../services/PublishedExportService.js";
import { BaseController } from "./BaseController.js";

class PublishedExportController extends BaseController {
  async sheets(req, res) {
    try {
      return res.json(await publishedExportService.exportSheets(req.params.id, req.body || {}));
    } catch (error) {
      return this.handleError(res, error, error.message || "Unable to export to Google Sheets");
    }
  }

  async calendar(req, res) {
    try {
      return res.json(await publishedExportService.exportCalendar(req.params.id, req.body || {}));
    } catch (error) {
      return this.handleError(res, error, error.message || "Unable to export to Google Calendar");
    }
  }
}

export default new PublishedExportController();
