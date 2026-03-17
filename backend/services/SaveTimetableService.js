import mongoose from "mongoose";

import sessionRepository from "../repositories/SessionRepository.js";
import timetableRepository from "../repositories/TimetableRepository.js";
import { AppError } from "../utils/AppError.js";

class SaveTimetableService {
  constructor({ sessions, timetables }) {
    this.sessions = sessions;
    this.timetables = timetables;
  }

  async save({ userId, sessionId, solverResult, title }) {
    if (!sessionId || !solverResult) {
      throw new AppError(400, "ERROR", "session_id and solver_result are required");
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      throw new AppError(400, "ERROR", "Invalid session_id");
    }

    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new AppError(404, "ERROR", "Session not found");
    }

    const snapshot = JSON.parse(JSON.stringify(session.constraints || {}));
    const timetable = await this.timetables.create({
      owner: userId,
      title: title || "Untitled Timetable",
      constraints: session.constraints || {},
      constraints_snapshot: snapshot,
      timetable: solverResult.timetable || [],
      grid: solverResult.grid || null,
      status: solverResult.status || "draft",
      explanation: solverResult.reasons || []
    });

    return { status: "SAVED", timetable_id: timetable._id };
  }
}

export default new SaveTimetableService({ sessions: sessionRepository, timetables: timetableRepository });
