import { cn } from "@/lib/utils";
import { Clock, MapPin, User as UserIcon } from "lucide-react";

type ClassSession = {
  id: string;
  subject: string;
  teacher?: string;
  room?: string;
  color?: string;
  sectionId?: string;
  section?: string;
  type?: "lec" | "lab" | "lecture";
};

type TimetableData = {
  [day: string]: {
    [timeSlot: string]: {
      [sectionId: string]: ClassSession | null;
    } | null;
  };
};

type SectionInfo = {
  id: string;
  name: string;
};

type RoomInfo = {
  id: string;
  type: "lecture" | "lab";
};

type ManualCell = {
  blockId?: string;
  roomId?: string;
  subject?: string;
  teacher?: string;
  type?: "lec" | "lab" | "lecture";
  sectionId?: string;
};

type ManualGrid = {
  [day: string]: {
    [timeSlot: string]: {
      [sectionId: string]: ManualCell;
    };
  };
};

type ManualBlock = {
  id: string;
  subject: string;
  type: "lec" | "lab";
  teacher: string;
  sectionId: string;
  remaining: number;
  roomId?: string;
};

type PendingPlacement = {
  day: string;
  timeSlot: string;
  sectionId: string;
  blockId: string;
} | null;

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DEFAULT_TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00"
];

function buildDisplayGrid(data?: TimetableData, sections: SectionInfo[] = [], visibleSectionIds?: string[]) {
  const gridData: TimetableData = {};
  const visibleSet = new Set(visibleSectionIds || []);
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]));
  const showAllSections = !visibleSectionIds;

  const isVisible = (entry: any, fallbackSectionId?: string) => {
    if (showAllSections) return true;
    const sectionId = entry?.sectionId || entry?.section_id || fallbackSectionId;
    const sectionName = entry?.section || (sectionId ? sectionNameById.get(sectionId) : undefined);
    return Boolean((sectionId && visibleSet.has(sectionId)) || (sectionName && visibleSet.has(sectionName)));
  };

  if (Array.isArray(data)) {
    data.forEach((c: any) => {
      if (!isVisible(c)) return;
      const slot = typeof c.slot === "string" ? c.slot : `${c.slot?.start}-${c.slot?.end}`;
      const sectionId = c.sectionId || c.section_id || c.section || "A";
      if (!gridData[c.day]) gridData[c.day] = {};
      if (!gridData[c.day][slot]) gridData[c.day][slot] = {};
      (gridData[c.day][slot] as Record<string, ClassSession | null>)[sectionId] = {
        id: `${c.subject}-${c.day}-${slot}-${sectionId}`,
        subject: c.subject,
        teacher: c.teacher,
        room: c.room || c.roomId,
        type: c.type === "lecture" ? "lec" : c.type,
        sectionId,
        section: c.section || sectionNameById.get(sectionId) || sectionId,
        color:
          c.type === "lab"
            ? "bg-emerald-100 text-emerald-900 border-emerald-200"
            : "bg-indigo-100 text-indigo-900 border-indigo-200"
      };
    });
    return gridData;
  }

  if (data && (data as any).classes) {
    (data as any).classes.forEach((c: any) => {
      if (!isVisible(c)) return;
      const sectionId = c.sectionId || c.section_id || c.section || "A";
      if (!gridData[c.day]) gridData[c.day] = {};
      if (!gridData[c.day][c.time]) gridData[c.day][c.time] = {};
      (gridData[c.day][c.time] as Record<string, ClassSession | null>)[sectionId] = {
        id: `${c.subject}-${c.day}-${c.time}-${sectionId}`,
        subject: c.subject,
        teacher: c.teacher,
        room: c.room || c.roomId,
        type: c.type === "lecture" ? "lec" : c.type,
        sectionId,
        section: c.section || sectionNameById.get(sectionId) || sectionId,
        color:
          c.type === "Lab"
            ? "bg-emerald-100 text-emerald-900 border-emerald-200"
            : "bg-indigo-100 text-indigo-900 border-indigo-200"
      };
    });
    return gridData;
  }

  if (data && typeof data === "object") {
    Object.entries(data).forEach(([day, slots]) => {
      if (!gridData[day]) gridData[day] = {};
      Object.entries(slots as any).forEach(([slot, sectionsByKey]) => {
        const entries: Record<string, ClassSession | null> = {};
        if (sectionsByKey && typeof sectionsByKey === "object") {
          Object.entries(sectionsByKey as any).forEach(([sectionKey, rawEntry]) => {
            const entry = rawEntry as any;
            if (!entry || !isVisible(entry, sectionKey)) return;
            const sectionId = entry.sectionId || sectionKey;
            entries[sectionId] = {
              id: `${entry.subject}-${day}-${slot}-${entry.sectionId || sectionKey}`,
              subject: entry.subject,
              teacher: entry.teacher,
              room: entry.room || entry.roomId,
              type: entry.type === "lecture" ? "lec" : entry.type,
              sectionId,
              section: entry.section || sectionNameById.get(sectionId) || sectionKey,
              color:
                entry.type === "lab"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                  : "bg-indigo-100 text-indigo-900 border-indigo-200"
            };
          });
        }
        if (Object.keys(entries).length) {
          gridData[day][slot] = entries;
        }
      });
    });
  }

  return gridData;
}

function FilledCard({
  subject,
  teacher,
  room,
  color,
  type
}: {
  subject: string;
  teacher?: string;
  room?: string;
  color?: string;
  type?: "lec" | "lab" | "lecture";
}) {
  const subjectLabel = type === "lab" ? `${subject} lab` : type ? `${subject} lec` : subject;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-left shadow-sm",
        color || "bg-slate-100 text-slate-900 border-slate-200"
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Scheduled</div>
      <div className="mt-1 text-sm font-semibold">{subjectLabel}</div>
      {teacher ? (
        <div className="mt-1 flex items-center gap-1 text-xs opacity-80">
          <UserIcon size={11} />
          {teacher}
        </div>
      ) : null}
      {room ? (
        <div className="mt-1 flex items-center gap-1 text-xs opacity-80">
          <MapPin size={11} />
          {room}
        </div>
      ) : null}
    </div>
  );
}

interface TimetableGridProps {
  data?: TimetableData;
  days?: string[];
  timeSlots?: string[];
  slotLabels?: Record<string, string>;
  isLoading?: boolean;
  sections?: SectionInfo[];
  rooms?: RoomInfo[];
  manualGrid?: ManualGrid;
  blocksById?: Record<string, ManualBlock>;
  selectedBlockId?: string | null;
  pendingPlacement?: PendingPlacement;
  visibleSectionIds?: string[];
  isValidCell?: (day: string, timeSlot: string, sectionId: string) => boolean;
  getAvailableRoomsForCell?: (day: string, timeSlot: string, sectionId: string) => RoomInfo[];
  onCellClick?: (day: string, timeSlot: string, sectionId: string) => void;
  onAssignRoom?: (day: string, timeSlot: string, sectionId: string, roomId: string) => void;
  onCancelPlacement?: () => void;
}

export function TimetableGrid({
  data,
  days,
  timeSlots,
  slotLabels,
  isLoading,
  sections,
  manualGrid,
  blocksById,
  pendingPlacement,
  visibleSectionIds,
  isValidCell,
  getAvailableRoomsForCell,
  onCellClick,
  onAssignRoom,
  onCancelPlacement
}: TimetableGridProps) {
  const resolvedDays = days || DEFAULT_DAYS;
  const resolvedTimeSlots = timeSlots || DEFAULT_TIME_SLOTS;
  const allSections = sections || [];
  const manualSections = visibleSectionIds
    ? allSections.filter((section) => visibleSectionIds.includes(section.id))
    : allSections;
  const hasManualMode = Boolean(manualGrid && manualSections.length > 0);
  const displayGrid = hasManualMode ? null : buildDisplayGrid(data, allSections, visibleSectionIds);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full min-h-0">
      <div
        className="grid bg-muted/30 border-b border-border"
        style={{
          gridTemplateColumns: `96px repeat(${resolvedDays.length}, minmax(0, 1fr))`
        }}
      >
        <div className="p-3 border-r border-border font-semibold text-xs text-muted-foreground flex items-center justify-center">
          <Clock size={16} />
        </div>
        {resolvedDays.map((day) => (
          <div key={day} className="p-3 font-semibold text-sm text-center border-r border-border last:border-0 text-foreground/80">
            {day}
          </div>
        ))}
      </div>

      <div className="h-full overflow-auto flex-1">
        {resolvedTimeSlots.map((time) => (
          <div
            key={time}
            className="grid min-h-[6rem]"
            style={{
              gridTemplateColumns: `96px repeat(${resolvedDays.length}, minmax(0, 1fr))`
            }}
          >
            <div className="border-r border-b border-border/50 p-3 text-xs font-medium text-muted-foreground text-center bg-muted/10">
              {slotLabels?.[time] || time}
            </div>

            {resolvedDays.map((day) => {
              if (hasManualMode) {
                return (
                  <div key={`${day}-${time}`} className="border-r border-b border-border/50 bg-white flex flex-col gap-2 p-2">
                    {manualSections.map((section) => {
                      const cell = manualGrid?.[day]?.[time]?.[section.id] || {};
                      const block = cell.blockId ? blocksById?.[cell.blockId] : null;
                      const subject = block?.subject || cell.subject;
                      const teacher = block?.teacher || cell.teacher;
                      const entryType = block?.type || cell.type;
                      const valid = Boolean(isValidCell?.(day, time, section.id));
                      const selectingRoom = Boolean(
                        pendingPlacement &&
                          pendingPlacement.day === day &&
                          pendingPlacement.timeSlot === time &&
                          pendingPlacement.sectionId === section.id
                      );
                      const availableRooms = getAvailableRoomsForCell?.(day, time, section.id) || [];
                      const clickable = Boolean(onCellClick && (valid || block));

                      return (
                        <button
                          key={`${day}-${time}-${section.id}`}
                          type="button"
                          onClick={() => onCellClick?.(day, time, section.id)}
                          disabled={!clickable}
                          className={cn(
                            "w-full min-h-[104px] rounded-xl border border-border/40 px-3 py-2 text-left transition-colors",
                            clickable ? "cursor-pointer" : "cursor-default",
                            valid && "valid-cell bg-emerald-100/90 hover:bg-emerald-200/90",
                            block && "bg-slate-50 hover:bg-slate-100",
                            selectingRoom && "bg-amber-50 hover:bg-amber-50"
                          )}
                        >
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {section.name}
                          </div>

                          {block ? (
                            <FilledCard
                              subject={block.subject}
                              teacher={block.teacher}
                              room={cell.roomId}
                              type={block.type}
                              color={
                                block.type === "lab"
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                                  : "bg-indigo-100 text-indigo-900 border-indigo-200"
                              }
                            />
                          ) : subject ? (
                            <FilledCard
                              subject={subject}
                              teacher={teacher}
                              room={cell.roomId}
                              type={entryType}
                              color={
                                entryType === "lab"
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                                  : "bg-indigo-100 text-indigo-900 border-indigo-200"
                              }
                            />
                          ) : selectingRoom ? (
                            <div
                              className="rounded-xl border border-amber-200 bg-white px-3 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Choose room
                              </div>
                              <select
                                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                defaultValue=""
                                onChange={(event) => {
                                  if (!event.target.value) return;
                                  onAssignRoom?.(day, time, section.id, event.target.value);
                                }}
                              >
                                <option value="">Select room</option>
                                {availableRooms.map((room) => (
                                  <option key={room.id} value={room.id}>
                                    {room.id}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="mt-2 text-xs text-slate-500 underline underline-offset-2"
                                onClick={onCancelPlacement}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                              {valid ? "Place here" : "Empty"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              }

              const sessionsBySection = displayGrid?.[day]?.[time] || {};
              return (
                <div key={`${day}-${time}`} className="border-r border-b border-border/50 bg-white p-2 transition-colors">
                  <div className="flex flex-col gap-2">
                    {manualSections.map((section) => {
                      const session = (sessionsBySection as Record<string, ClassSession | null>)?.[section.id] || null;
                      return (
                        <div
                          key={`${day}-${time}-${section.id}`}
                          className="min-h-[104px] rounded-xl border border-border/40 px-3 py-2"
                        >
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {section.name}
                          </div>
                          {session ? (
                            <FilledCard
                              subject={session.subject}
                              teacher={session.teacher}
                              room={session.room}
                              type={session.type}
                              color={session.color}
                            />
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                              Empty
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
