import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

import timetableRepository from "../repositories/TimetableRepository.js";
import { AppError } from "../utils/AppError.js";

class ShareService {
  constructor(repository) {
    this.repository = repository;
  }

  async getOwnedTimetable(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ERROR", "Invalid id");
    }

    const timetable = await this.repository.findById(id);
    if (!timetable) {
      throw new AppError(404, "ERROR", "Not found");
    }

    if (timetable.owner.toString() !== userId) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    return timetable;
  }

  async createShareToken({ id, userId, permission }) {
    const timetable = await this.getOwnedTimetable(id, userId);
    const token = uuidv4();
    const mode = permission === "edit" ? "edit" : "view";

    timetable.share_tokens.push({ token, permission: mode, created_by: userId });
    await timetable.save();

    return { status: "OK", token, permission: mode };
  }

  async getSharedTimetable(token) {
    const timetable = await this.repository.findSharedByTokenLean(token);
    if (!timetable) {
      throw new AppError(404, "ERROR", "Not found");
    }

    const share = timetable.share_tokens.find((s) => s.token === token);
    if (!share) {
      throw new AppError(404, "ERROR", "Not found");
    }

    const sanitized = { ...timetable };
    delete sanitized.share_tokens;
    return { timetable: sanitized, permission: share.permission };
  }

  async updateSharedTimetable(token, updates) {
    const timetable = await this.repository.findSharedByToken(token);
    if (!timetable) {
      throw new AppError(404, "ERROR", "Not found");
    }

    const share = timetable.share_tokens.find((s) => s.token === token);
    if (!share || share.permission !== "edit") {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    const { constraints, grid, timetable: solverTimetable, status, explanation } = updates || {};
    if (constraints !== undefined) timetable.constraints = constraints;
    if (grid !== undefined) timetable.grid = grid;
    if (solverTimetable !== undefined) timetable.timetable = solverTimetable;
    if (status !== undefined) timetable.status = status;
    if (explanation !== undefined) timetable.explanation = explanation;
    await timetable.save();

    return { timetable };
  }
}

export default new ShareService(timetableRepository);
