import mongoose from "mongoose";

import draftRepository from "../repositories/DraftRepository.js";
import draftValidator from "./DraftValidator.js";
import solverService from "./SolverService.js";
import { AppError } from "../utils/AppError.js";

const DRAFT_ARRAY_FIELDS = ["days", "slots", "sections", "teachers", "subjects", "rooms"];
const DRAFT_OBJECT_FIELDS = ["constraints", "manualGrid"];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeUserId(userId) {
  if (!userId) return null;
  return typeof userId === "string" ? userId : userId.toString();
}

function defaultRooms(inputRooms = []) {
  return Array.isArray(inputRooms) ? clone(inputRooms) : [];
}

function defaultConstraints(inputConstraints = {}) {
  return {
    noConsecutiveClasses: Boolean(inputConstraints?.noConsecutiveClasses),
    avoidGaps: Boolean(inputConstraints?.avoidGaps),
    labAfterLecture: Boolean(inputConstraints?.labAfterLecture)
  };
}

function defaultManualGrid(inputGrid = {}) {
  return isPlainObject(inputGrid) ? clone(inputGrid) : {};
}

function normalizeDraftDocument(draft) {
  if (!draft) return null;
  const plain = draft.toObject ? draft.toObject({ flattenMaps: true }) : draft;
  return {
    ...plain,
    days: Array.isArray(plain.days) ? plain.days : [],
    slots: Array.isArray(plain.slots) ? plain.slots : [],
    sections: Array.isArray(plain.sections) ? plain.sections : [],
    teachers: Array.isArray(plain.teachers) ? plain.teachers : [],
    subjects: Array.isArray(plain.subjects) ? plain.subjects : [],
    rooms: defaultRooms(plain.rooms || []),
    manualGrid: defaultManualGrid(plain.manualGrid || {}),
    constraints: defaultConstraints(plain.constraints || {}),
    lastEditedAt: plain.lastEditedAt || null
  };
}

function pickDraftPayload(input = {}, { isCreate = false } = {}) {
  const payload = {};

  if (isCreate || input.name !== undefined) {
    payload.name = typeof input.name === "string" && input.name.trim()
      ? input.name.trim()
      : "Untitled Draft";
  }

  DRAFT_ARRAY_FIELDS.forEach((field) => {
    if (isCreate) {
      payload[field] = field === "rooms"
        ? defaultRooms(input[field])
        : Array.isArray(input[field]) ? clone(input[field]) : [];
      return;
    }

    if (input[field] !== undefined) {
      payload[field] = field === "rooms"
        ? defaultRooms(input[field])
        : Array.isArray(input[field]) ? clone(input[field]) : input[field];
    }
  });

  DRAFT_OBJECT_FIELDS.forEach((field) => {
    if (isCreate) {
      payload[field] = field === "manualGrid"
        ? defaultManualGrid(input[field])
        : defaultConstraints(input[field]);
      return;
    }

    if (input[field] !== undefined) {
      payload[field] = field === "manualGrid"
        ? defaultManualGrid(input[field])
        : isPlainObject(input[field]) ? clone(input[field]) : input[field];
    }
  });

  if (isCreate) {
    payload.lastEditedAt = input.lastEditedAt || null;
  } else if (input.lastEditedAt !== undefined) {
    payload.lastEditedAt = input.lastEditedAt || null;
  }

  return payload;
}

function getSubjectFrequency(subject, sessionType) {
  const value = Number(subject?.sessions?.[sessionType]?.frequency || 0);
  return Number.isFinite(value) ? value : 0;
}

function buildSolveMetadata(draft) {
  const perSectionRequired = draft.subjects.reduce(
    (sum, subject) => sum + getSubjectFrequency(subject, "lec") + getSubjectFrequency(subject, "lab"),
    0
  );

  return {
    draft_id: draft._id,
    name: draft.name,
    days: draft.days.length,
    slots: draft.slots.length,
    sections: draft.sections.length,
    subjects: draft.subjects.length,
    teachers: draft.teachers.length,
    lecture_rooms: (draft.rooms || []).filter((room) => room.type === "lecture").length,
    lab_rooms: (draft.rooms || []).filter((room) => room.type === "lab").length,
    per_section_required_sessions: perSectionRequired,
    total_required_sessions: perSectionRequired * draft.sections.length,
    total_available_section_slots: draft.days.length * draft.slots.length
  };
}

class DraftService {
  constructor(repository, validator, solver) {
    this.repository = repository;
    this.validator = validator;
    this.solver = solver;
  }

  async getAccessibleDraft(draftId, userId) {
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      throw new AppError(400, "INVALID_DRAFT_ID", "Invalid draft id");
    }

    const draft = await this.repository.findById(draftId);
    if (!draft) {
      throw new AppError(404, "DRAFT_NOT_FOUND", "Draft not found");
    }

    const ownerId = normalizeUserId(draft.user_id);
    const requesterId = normalizeUserId(userId);

    if (ownerId && (!requesterId || ownerId !== requesterId)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this draft");
    }

    return draft;
  }

  async createDraft({ userId = null, input = {} } = {}) {
    const payload = pickDraftPayload(input, { isCreate: true });
    const candidate = { user_id: userId || null, ...payload };
    const validation = this.validator.validateForSave(candidate);

    if (!validation.valid) {
      throw new AppError(400, "INVALID_DRAFT", "Draft payload is invalid", validation.errors);
    }

    return this.repository.create(candidate);
  }

  async getDraft({ draftId, userId = null }) {
    return this.getAccessibleDraft(draftId, userId);
  }

  async updateDraft({ draftId, userId = null, updates = {} } = {}) {
    const draft = await this.getAccessibleDraft(draftId, userId);
    const patch = pickDraftPayload(updates, { isCreate: false });

    const currentDraft = normalizeDraftDocument(draft);
    const nextDraft = {
      ...currentDraft,
      ...patch,
      constraints: patch.constraints !== undefined
        ? { ...currentDraft.constraints, ...patch.constraints }
        : currentDraft.constraints
    };

    const validation = this.validator.validateForSave(nextDraft);
    if (!validation.valid) {
      throw new AppError(400, "INVALID_DRAFT", "Draft payload is invalid", validation.errors);
    }

    Object.entries(patch).forEach(([key, value]) => {
      if (key === "constraints" && isPlainObject(value)) {
        draft[key] = { ...draft[key]?.toObject?.(), ...value };
        return;
      }
      draft[key] = value;
    });

    await draft.save();
    return draft;
  }

  async solveDraft({ draftId, userId = null } = {}) {
    const draft = await this.getAccessibleDraft(draftId, userId);
    const plainDraft = normalizeDraftDocument(draft);
    const validation = this.validator.validateForSolve(plainDraft);

    if (!validation.valid) {
      throw new AppError(400, "INVALID_DRAFT", "Draft is incomplete or invalid", validation.errors);
    }

    const result = await this.solver.runSolver(plainDraft);
    return {
      draft,
      result,
      metadata: buildSolveMetadata(plainDraft)
    };
  }
}

export const draftService = new DraftService(draftRepository, draftValidator, solverService);
export default draftService;
export const DraftServiceError = AppError;
export const createDraft = (args) => draftService.createDraft(args);
export const getDraft = (args) => draftService.getDraft(args);
export const updateDraft = (args) => draftService.updateDraft(args);
export const solveDraft = (args) => draftService.solveDraft(args);
