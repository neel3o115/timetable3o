import { toErrorPayload } from "../utils/AppError.js";

export class BaseController {
  handleError(res, error, fallbackMessage = "Unexpected error") {
    const { statusCode, payload } = toErrorPayload(error, fallbackMessage);
    return res.status(statusCode).json(payload);
  }
}
