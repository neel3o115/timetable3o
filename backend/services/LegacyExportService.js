import mongoose from "mongoose";

import timetableRepository from "../repositories/TimetableRepository.js";
import { buildTimetableGrid } from "../solver/buildGrid.js";
import { formatSlot } from "../utils/formatSlot.js";
import { AppError } from "../utils/AppError.js";

function parseSlot(slot) {
  if (!slot) return { start: "", end: "" };
  if (typeof slot === "string") {
    const parts = slot.split("-");
    return { start: parts[0] || "", end: parts[1] || "" };
  }
  return { start: slot.start || "", end: slot.end || "" };
}

function toICSDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
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

function buildEventsFromTimetable(timetable, baseDate) {
  return timetable.map((entry, idx) => {
    const { start, end } = parseSlot(entry.slot);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const date = new Date(baseDate);
    const dayOffset = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(entry.day);
    if (dayOffset >= 0) {
      date.setDate(date.getDate() + (dayOffset - 1));
    }
    const startDate = new Date(date);
    startDate.setHours(startH || 0, startM || 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(endH || 0, endM || 0, 0, 0);

    return {
      uid: `${entry.session_id || idx}@timetable3o`,
      summary: `${entry.subject} (${entry.section})`,
      description: `Subject: ${entry.subject}\nTeacher: ${entry.teacher || ""}\nRoom: ${entry.room || ""}\nSection: ${entry.section || ""}`,
      dtstart: toICSDate(startDate),
      dtend: toICSDate(endDate)
    };
  });
}

function buildCSV(grid, days, slots, sections) {
  const header = ["Time", ...days];
  const rows = [header];

  slots.forEach((slot) => {
    const row = [slot];
    days.forEach((day) => {
      const cell = grid?.[day]?.[slot] || {};
      const content = sections
        .map((section) => {
          const entry = cell?.[section];
          if (!entry) return null;
          return `${section}: ${entry.subject}${entry.teacher ? ` (${entry.teacher})` : ""}${entry.room ? ` @ ${entry.room}` : ""}`;
        })
        .filter(Boolean)
        .join(" | ");
      row.push(content || "");
    });
    rows.push(row);
  });

  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

class LegacyExportService {
  constructor(repository) {
    this.repository = repository;
  }

  async resolveTimetable({ id, token, user }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ERROR", "Invalid id");
    }

    const timetable = await this.repository.findByIdLean(id);
    if (!timetable) {
      throw new AppError(404, "ERROR", "Not found");
    }

    const isOwner = user?._id && timetable.owner.toString() === user._id;
    const isCollaborator = user?._id && timetable.collaborators?.some((u) => u.toString() === user._id);
    const hasShare = token && timetable.share_tokens?.some((s) => s.token === token);
    if (!isOwner && !isCollaborator && !hasShare) {
      throw new AppError(403, "ERROR", "FORBIDDEN");
    }

    return timetable;
  }

  async exportICS(args) {
    const timetable = await this.resolveTimetable(args);
    let baseDate = args.startDate ? new Date(args.startDate) : getNextMonday();
    if (Number.isNaN(baseDate.getTime())) {
      baseDate = getNextMonday();
    }
    const events = buildEventsFromTimetable(timetable.timetable || [], baseDate);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Timetable3o//EN",
      ...events.flatMap((event) => [
        "BEGIN:VEVENT",
        `UID:${event.uid}`,
        `SUMMARY:${event.summary}`,
        `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
        `DTSTART:${event.dtstart}`,
        `DTEND:${event.dtend}`,
        "END:VEVENT"
      ]),
      "END:VCALENDAR"
    ].join("\r\n");

    return { content: ics, filename: "timetable.ics", contentType: "text/calendar; charset=utf-8" };
  }

  async exportCSV(args) {
    const timetable = await this.resolveTimetable(args);
    const days = timetable.constraints?.days || [];
    const slots = (timetable.constraints?.time_slots || []).map(formatSlot);
    const sections = timetable.constraints?.sections || [];
    const grid = timetable.grid || buildTimetableGrid(timetable.timetable || [], days, slots, sections);
    const csv = buildCSV(grid, days, slots, sections);
    return { content: csv, filename: "timetable.csv", contentType: "text/csv; charset=utf-8" };
  }
}

export default new LegacyExportService(timetableRepository);
