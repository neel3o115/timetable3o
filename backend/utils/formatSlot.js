export function formatSlot(slot) {
  if (!slot) return "";
  if (typeof slot === "string") return slot;
  const start = slot.start || "";
  const end = slot.end || "";
  if (!start && !end) return "";
  if (start && end) return `${start}-${end}`;
  return start || end;
}
