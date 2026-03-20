import crypto from "crypto";

import draftRepository from "../repositories/DraftRepository.js";
import publishedTimetableRepository from "../repositories/PublishedTimetableRepository.js";
import solverService from "./SolverService.js";
import { AppError } from "../utils/AppError.js";

function normalizeUserId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toString();
}

function makeShareId() {
  return crypto.randomBytes(4).toString("base64url");
}

function getSectionName(sectionId, sections = []) {
  return sections.find((section) => section.id === sectionId)?.name || sectionId;
}

function deriveTimetableFromGrid(grid = {}, sections = []) {
  const timetable = [];

  Object.entries(grid || {}).forEach(([day, slots]) => {
    Object.entries(slots || {}).forEach(([slotId, sectionCells]) => {
      Object.entries(sectionCells || {}).forEach(([sectionId, cell]) => {
        if (!cell?.subject) return;

        timetable.push({
          day,
          slot: slotId,
          sectionId,
          section: getSectionName(sectionId, sections),
          subject: cell.subject,
          teacher: cell.teacher || "",
          roomId: cell.roomId || "",
          type: cell.type === "lec" ? "lecture" : cell.type || "lecture"
        });
      });
    });
  });

  return timetable;
}

function normalizeTimetableEntries(timetable = [], sections = []) {
  return (timetable || [])
    .filter((entry) => entry?.day && entry?.slot && entry?.sectionId && entry?.subject)
    .map((entry) => ({
      day: entry.day,
      slot: typeof entry.slot === "string" ? entry.slot : entry.slot?.id,
      sectionId: entry.sectionId || entry.section_id,
      section: entry.section || getSectionName(entry.sectionId || entry.section_id, sections),
      subject: entry.subject,
      teacher: entry.teacher || "",
      roomId: entry.roomId || entry.room || "",
      type: entry.type === "lec" ? "lecture" : entry.type || "lecture"
    }))
    .filter((entry) => entry.slot && entry.sectionId);
}

function toManualGridFromSolver(timetable = [], days = [], slots = [], sections = []) {
  const grid = {};
  days.forEach((day) => {
    grid[day] = {};
    slots.forEach((slot) => {
      grid[day][slot.id] = {};
      sections.forEach((section) => {
        grid[day][slot.id][section.id] = null;
      });
    });
  });

  timetable.forEach((entry) => {
    const day = entry.day;
    const slotId = typeof entry.slot === "string" ? entry.slot : entry.slot?.id || entry.start_slot?.id;
    const sectionId = entry.sectionId || entry.section_id;
    if (!day || !slotId || !sectionId || !grid[day]?.[slotId]) return;

    grid[day][slotId][sectionId] = {
      subject: entry.subject,
      teacher: entry.teacher || "",
      roomId: entry.roomId || entry.room || "",
      type: entry.type === "lecture" ? "lec" : entry.type || "lec",
      sectionId
    };
  });

  return grid;
}

class PublishedTimetableService {
  constructor({ drafts, published, solver }) {
    this.drafts = drafts;
    this.published = published;
    this.solver = solver;
  }

  async getAccessibleDraft(draftId, userId) {
    const draft = await this.drafts.findByIdLean(draftId);
    if (!draft) {
      throw new AppError(404, "ERROR", "Draft not found");
    }

    const ownerId = normalizeUserId(draft.user_id);
    const requesterId = normalizeUserId(userId);
    if (ownerId && ownerId !== requesterId) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    return draft;
  }

  async createUniqueShareId() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = makeShareId();
      const exists = await this.published.exists({ id: candidate });
      if (!exists) return candidate;
    }
    throw new Error("Unable to generate share id");
  }

  async resolvePayload(body, userId) {
    const { draft_id, name, days, slots, sections, timetable, grid } = body || {};

    if (draft_id) {
      const draft = await this.getAccessibleDraft(draft_id, userId);

      if (grid && typeof grid === "object") {
        const resolvedSections = Array.isArray(sections) && sections.length > 0 ? sections : draft.sections || [];
        return {
          name: name || draft.name || "Shared Timetable",
          days: Array.isArray(days) && days.length > 0 ? days : draft.days || [],
          slots: Array.isArray(slots) && slots.length > 0 ? slots : draft.slots || [],
          sections: resolvedSections,
          timetable: Array.isArray(timetable) && timetable.length > 0
            ? normalizeTimetableEntries(timetable, resolvedSections)
            : deriveTimetableFromGrid(grid, resolvedSections),
          grid
        };
      }

      if (Array.isArray(timetable) && timetable.length > 0) {
        const resolvedSections = Array.isArray(sections) && sections.length > 0 ? sections : draft.sections || [];
        return {
          name: name || draft.name || "Shared Timetable",
          days: Array.isArray(days) && days.length > 0 ? days : draft.days || [],
          slots: Array.isArray(slots) && slots.length > 0 ? slots : draft.slots || [],
          sections: resolvedSections,
          timetable: normalizeTimetableEntries(timetable, resolvedSections),
          grid: null
        };
      }

      const solved = await this.solver.runSolver(draft);
      if (solved.status !== "POSSIBLE") {
        throw new AppError(400, "ERROR", "Draft could not be solved before publishing", solved.reasons || []);
      }

      return {
        name: draft.name || "Shared Timetable",
        days: draft.days || [],
        slots: draft.slots || [],
        sections: draft.sections || [],
        timetable: normalizeTimetableEntries(solved.timetable || [], draft.sections || []),
        grid: toManualGridFromSolver(solved.timetable || [], draft.days || [], draft.slots || [], draft.sections || [])
      };
    }

    if (!Array.isArray(days) || !Array.isArray(slots) || !Array.isArray(sections)) {
      throw new AppError(400, "ERROR", "days, slots, and sections are required when publishing without draft_id");
    }

    return {
      name: name || "Shared Timetable",
      days,
      slots,
      sections,
      timetable: grid && typeof grid === "object"
        ? deriveTimetableFromGrid(grid, sections)
        : normalizeTimetableEntries(timetable || [], sections),
      grid: grid || null
    };
  }

  async publish(body, user) {
    const payload = await this.resolvePayload(body, user?.id || user?._id || null);
    const shareId = await this.createUniqueShareId();
    const published = await this.published.create({
      owner: user?._id || user?.id || null,
      id: shareId,
      ...payload
    });
    return { shareId: published.id };
  }

  async getPublished(shareId) {
    const published = await this.published.findByShareIdLean(shareId);
    if (!published) {
      throw new AppError(404, "NOT_FOUND", "Published timetable not found");
    }

    return {
      id: published.id,
      name: published.name,
      days: published.days || [],
      slots: published.slots || [],
      sections: published.sections || [],
      timetable: published.timetable || [],
      grid: published.grid || null,
      created_at: published.created_at
    };
  }
}

export default new PublishedTimetableService({
  drafts: draftRepository,
  published: publishedTimetableRepository,
  solver: solverService
});
