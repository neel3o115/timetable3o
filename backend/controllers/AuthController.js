import authService from "../services/AuthService.js";
import { BaseController } from "./BaseController.js";

class AuthController extends BaseController {
  async signup(req, res) {
    try {
      console.info("[auth] POST /auth/signup hit", {
        email: req.body?.email || null,
        hasSessionId: Boolean(req.body?.session_id)
      });

      const user = await authService.register({
        email: req.body?.email,
        password: req.body?.password
      });
      const result = authService.buildAuthResponse(user);

      res.cookie(result.cookie.name, result.cookie.value, result.cookie.options);
      return res.status(201).json({ status: "OK", user: result.user });
    } catch (error) {
      return this.handleError(res, error, "Unable to create account");
    }
  }

  async login(req, res) {
    try {
      console.info("[auth] POST /auth/login hit", {
        email: req.body?.email || null,
        hasSessionId: Boolean(req.body?.session_id)
      });

      const result = await authService.authenticate({
        email: req.body?.email,
        password: req.body?.password,
        sessionId: req.body?.session_id
      });

      res.cookie(result.cookie.name, result.cookie.value, result.cookie.options);
      return res.json({ status: "OK", user: result.user, claimed_session: result.claimed_session });
    } catch (error) {
      return this.handleError(res, error, "Invalid email or password");
    }
  }

  async session(req, res) {
    try {
      console.info("[auth] session check hit");
      console.info("[auth] user in session:", req.user || null);
      return res.json(authService.getCurrentUser(req.user));
    } catch (error) {
      return this.handleError(res, error, "Unable to load auth session");
    }
  }

  async logout(_req, res) {
    console.info("[auth] POST /auth/logout hit");
    res.clearCookie("tt3o_token", authService.getLogoutCookieOptions());
    return res.json({ status: "OK" });
  }
}

export default new AuthController();
