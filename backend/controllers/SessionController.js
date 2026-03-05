import sessionService from "../services/SessionService.js";
import { BaseController } from "./BaseController.js";

class SessionController extends BaseController {
  async claim(req, res) {
    try {
      return res.json(await sessionService.claimSession({
        sessionId: req.body?.session_id,
        userId: req.user._id,
        title: req.body?.title
      }));
    } catch (error) {
      return this.handleError(res, error, "Unable to claim session");
    }
  }
}

export default new SessionController();
