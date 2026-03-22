import legacyExportService from "../services/LegacyExportService.js";
import { BaseController } from "./BaseController.js";

class LegacyExportController extends BaseController {
  async ics(req, res) {
    try {
      const result = await legacyExportService.exportICS({
        id: req.params.id,
        token: req.query.token,
        user: req.user,
        startDate: req.query.start_date
      });
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename=\"${result.filename}\"`);
      return res.send(result.content);
    } catch (error) {
      return this.handleError(res, error, "Unable to export ICS");
    }
  }

  async csv(req, res) {
    try {
      const result = await legacyExportService.exportCSV({
        id: req.params.id,
        token: req.query.token,
        user: req.user
      });
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename=\"${result.filename}\"`);
      return res.send(result.content);
    } catch (error) {
      return this.handleError(res, error, "Unable to export CSV");
    }
  }

  async xlsx(_req, res) {
    return res.status(501).json({
      status: "NOT_IMPLEMENTED",
      message: "XLSX export is not implemented yet. Use CSV export for Google Sheets."
    });
  }
}

export default new LegacyExportController();
