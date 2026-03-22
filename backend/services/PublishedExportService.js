import publishedTimetableRepository from "../repositories/PublishedTimetableRepository.js";
import { AppError } from "../utils/AppError.js";

function buildSlotMap(slots = []) {
  return new Map((slots || []).map((slot) => [slot.id, slot]));
}

function getSectionName(sectionId, sections = []) {
  return sections.find((section) => section.id === sectionId)?.name || sectionId;
}

function flattenRows(published) {
  const slotMap = buildSlotMap(published.slots || []);
  return (published.timetable || []).map((entry) => {
    const slot = slotMap.get(entry.slot);
    return [
      entry.day,
      slot ? `${slot.start}-${slot.end}` : entry.slot,
      entry.section || getSectionName(entry.sectionId, published.sections || []),
      entry.subject,
      entry.teacher || "",
      entry.roomId || ""
    ];
  });
}

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = (8 - day) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

class PublishedExportService {
  constructor(repository) {
    this.repository = repository;
  }

  async getPublishedOrThrow(id) {
    const published = await this.repository.findByShareIdLean(id);
    if (!published) {
      throw new AppError(404, "NOT_FOUND", "Published timetable not found");
    }
    return published;
  }

  async exportSheets(id, body = {}) {
    await this.getPublishedOrThrow(id);
    void body;
    throw new AppError(501, "NOT_IMPLEMENTED", "Google Sheets export is no longer available");
  }

  async exportCalendar(id, body = {}) {
    await this.getPublishedOrThrow(id);
    void body;
    throw new AppError(501, "NOT_IMPLEMENTED", "Google Calendar export is no longer available");
  }
}

export default new PublishedExportService(publishedTimetableRepository);
