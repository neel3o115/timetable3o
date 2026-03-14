import mongoose from "mongoose";

import draftRepository from "../repositories/DraftRepository.js";
import publishedTimetableRepository from "../repositories/PublishedTimetableRepository.js";
import sessionRepository from "../repositories/SessionRepository.js";
import timetableRepository from "../repositories/TimetableRepository.js";
import { AppError } from "../utils/AppError.js";

function snapshotConstraints(constraints = {}) {
  return JSON.parse(JSON.stringify(constraints || {}));
}

function normalizeUserId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toString();
}

class TimetableService {
  constructor({ drafts, published, sessions, timetables }) {
    this.drafts = drafts;
    this.published = published;
    this.sessions = sessions;
    this.timetables = timetables;
  }

  async listUserTimetables(userId) {
    const [drafts, published, saved] = await Promise.all([
      this.drafts.findByUser(userId),
      this.published.findByOwner(userId),
      this.timetables.findByOwner(userId)
    ]);

    const timetables = [
      ...drafts.map((draft) => ({
        id: draft._id.toString(),
        name: draft.name || "Untitled Draft",
        status: "draft",
        updatedAt: draft.updatedAt || draft.createdAt,
        href: `/editor/draft/${draft._id}`,
        kind: "draft"
      })),
      ...published.map((item) => ({
        id: item.id,
        name: item.name || "Shared Timetable",
        status: "published",
        updatedAt: item.updated_at || item.created_at,
        href: `/t/${item.id}`,
        kind: "published"
      })),
      ...saved.map((item) => ({
        id: item._id.toString(),
        name: item.title || "Untitled Timetable",
        status: item.status === "POSSIBLE" ? "published" : "draft",
        updatedAt: item.updatedAt || item.createdAt,
        href: `/editor/${item._id}`,
        kind: "saved"
      }))
    ].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    return { timetables };
  }

  async createTimetableFromSession({ userId, title, sessionId }) {
    let constraints = {};
    let grid = null;
    let timetable = [];
    let status = "draft";
    let explanation = [];
    let chat_history = [];
    let constraints_snapshot = {};

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      const session = await this.sessions.findById(sessionId);
      if (session) {
        constraints = session.constraints || {};
        grid = session.last_grid || null;
        timetable = session.last_solver_result || [];
        status = session.last_solver_status || "draft";
        explanation = session.last_solver_reasons || [];
        chat_history = session.messages || [];
        constraints_snapshot = snapshotConstraints(session.constraints || {});
      }
    }

    const created = await this.timetables.create({
      owner: userId,
      title: title || "Untitled Timetable",
      constraints,
      constraints_snapshot: snapshotConstraints(constraints_snapshot),
      timetable,
      grid,
      status,
      explanation,
      chat_history
    });

    return { timetable: created };
  }

  async getAccessibleTimetable(id, requesterId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ERROR", "Invalid id");
    }

    const timetable = await this.timetables.findById(id);
    if (!timetable) {
      throw new AppError(404, "ERROR", "Not found");
    }

    const isOwner = timetable.owner.toString() === requesterId;
    const isCollaborator = timetable.collaborators?.some((u) => u.toString() === requesterId);
    if (!isOwner && !isCollaborator) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    return timetable;
  }

  async getTimetable({ id, userId }) {
    const timetable = await this.getAccessibleTimetable(id, userId);
    return { timetable };
  }

  async updateTimetable({ id, userId, updates }) {
    const timetable = await this.getAccessibleTimetable(id, userId);
    const { title, constraints, grid, timetable: solverTimetable, status, explanation, chat_history } = updates;

    if (title !== undefined) timetable.title = title;
    if (constraints !== undefined) {
      timetable.constraints = constraints;
      timetable.constraints_snapshot = snapshotConstraints(constraints);
    }
    if (grid !== undefined) timetable.grid = grid;
    if (solverTimetable !== undefined) timetable.timetable = solverTimetable;
    if (status !== undefined) timetable.status = status;
    if (explanation !== undefined) timetable.explanation = explanation;
    if (chat_history !== undefined) timetable.chat_history = chat_history;

    await timetable.save();
    return { timetable };
  }

  async deleteOwnedItem({ id, userId }) {
    const requesterId = normalizeUserId(userId);

    if (mongoose.Types.ObjectId.isValid(id)) {
      const draft = await this.drafts.findById(id);
      if (draft) {
        const ownerId = normalizeUserId(draft.user_id);
        if (ownerId && ownerId !== requesterId) {
          throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
        }
        await draft.deleteOne();
        return { status: "DELETED", kind: "draft" };
      }

      const timetable = await this.timetables.findById(id);
      if (timetable) {
        const ownerId = normalizeUserId(timetable.owner);
        if (ownerId !== requesterId) {
          throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
        }
        await timetable.deleteOne();
        return { status: "DELETED", kind: "saved" };
      }
    }

    const published = await this.published.findByShareId(id);
    if (!published) {
      throw new AppError(404, "NOT_FOUND", "Timetable not found");
    }

    const ownerId = normalizeUserId(published.owner);
    if (ownerId && ownerId !== requesterId) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    await published.deleteOne();
    return { status: "DELETED", kind: "published" };
  }
}

export default new TimetableService({
  drafts: draftRepository,
  published: publishedTimetableRepository,
  sessions: sessionRepository,
  timetables: timetableRepository
});
