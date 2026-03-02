import mongoose from "mongoose";

import sessionRepository from "../repositories/SessionRepository.js";
import timetableRepository from "../repositories/TimetableRepository.js";
import { AppError } from "../utils/AppError.js";

class SessionService {
  constructor({ sessions, timetables }) {
    this.sessions = sessions;
    this.timetables = timetables;
  }

  async claimSession({ sessionId, userId, title }) {
    if (!sessionId) {
      throw new AppError(400, "ERROR", "session_id is required");
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      throw new AppError(400, "ERROR", "Invalid session_id");
    }

    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new AppError(404, "ERROR", "Session not found or expired");
    }

    const timetable = await this.timetables.create({
      owner: userId,
      title: title || "Untitled Timetable",
      constraints: session.constraints || {},
      constraints_snapshot: JSON.parse(JSON.stringify(session.constraints || {})),
      timetable: session.last_solver_result || [],
      grid: session.last_grid || null,
      status: session.last_solver_status || "draft",
      explanation: session.last_solver_reasons || [],
      chat_history: session.messages || []
    });

    session.user_id = userId;
    await session.save();

    return { status: "CLAIMED", timetable_id: timetable._id };
  }
}

export default new SessionService({ sessions: sessionRepository, timetables: timetableRepository });
