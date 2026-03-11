import { formatSlot } from "../utils/formatSlot.js";

function cloneEntry(entry) {
  return {
    subject: entry.subject,
    type: entry.type,
    teacher: entry.teacher,
    room: entry.room || entry.roomId,
    roomId: entry.roomId || entry.room,
    session_id: entry.session_id,
    section: entry.section,
    sectionId: entry.sectionId || entry.section_id,
    duration: entry.duration || 1
  };
}

export function buildTimetableGrid(timetable, days, timeSlots, sections) {
  const grid = {};
  const slotKeys = timeSlots.map((slot) => formatSlot(slot));
  const slotIndexByKey = new Map(slotKeys.map((slotKey, index) => [slotKey, index]));

  for (const day of days) {
    grid[day] = {};
    for (const slot of timeSlots) {
      const slotKey = formatSlot(slot);
      grid[day][slotKey] = {};
      for (const section of sections) {
        grid[day][slotKey][section] = null;
      }
    }
  }

  for (const entry of timetable) {
    const { day, section } = entry;
    const startKey = formatSlot(entry.start_slot || entry.slot);
    const startIndex = slotIndexByKey.get(startKey);
    const duration = Math.max(Number(entry.duration || 1), 1);

    if (!grid[day]) {
      grid[day] = {};
    }

    if (startIndex === undefined) {
      if (!grid[day][startKey]) {
        grid[day][startKey] = {};
      }
      grid[day][startKey][section] = cloneEntry(entry);
      continue;
    }

    for (let offset = 0; offset < duration; offset += 1) {
      const slotKey = slotKeys[startIndex + offset];
      if (!slotKey) break;
      if (!grid[day][slotKey]) {
        grid[day][slotKey] = {};
      }
      grid[day][slotKey][section] = cloneEntry(entry);
    }
  }

  return grid;
}
