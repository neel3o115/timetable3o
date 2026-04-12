import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimetableGrid } from "@/components/TimetableGrid";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Copy, ExternalLink, Loader2, Plus, Share2, Trash2, Wand2 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type DraftSlot = { id: string; start: string; end: string };
type DraftEntity = { id: string; name: string };
type DraftRoom = { id: string; type: "lecture" | "lab" };
type SubjectTeacherMap = Record<string, { lec?: string; lab?: string }>;
type DraftSubject = {
  id: string;
  name: string;
  sessions: {
    lec: { frequency: number };
    lab: { frequency: number };
  };
  teachers: SubjectTeacherMap;
};

type Draft = {
  _id: string;
  user_id?: string | null;
  name: string;
  days: string[];
  slots: DraftSlot[];
  sections: DraftEntity[];
  teachers: DraftEntity[];
  subjects: DraftSubject[];
  rooms: DraftRoom[];
  manualGrid?: ManualGrid;
  constraints: {
    noConsecutiveClasses?: boolean;
    avoidGaps?: boolean;
    labAfterLecture?: boolean;
  };
  lastEditedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SolveResult = {
  status: "POSSIBLE" | "NOT_POSSIBLE";
  grid?: any;
  timetable?: any[];
  time?: { days: string[]; slots: string[] };
  reasons?: string[];
  metadata?: Record<string, any>;
};

type PublishResponse = {
  shareId: string;
};

type DraftError = {
  status?: string;
  message?: string;
  errors?: { field: string; code: string; message: string }[];
  reasons?: string[];
};

type Block = {
  id: string;
  subject: string;
  type: "lec" | "lab";
  teacher: string;
  sectionId: string;
  remaining: number;
  roomId?: string;
};

type BlockTemplate = Omit<Block, "remaining"> & {
  sectionName: string;
  total: number;
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
    [slot: string]: {
      [sectionId: string]: ManualCell;
    };
  };
};

type PendingPlacement = {
  day: string;
  timeSlot: string;
  sectionId: string;
  blockId: string;
} | null;

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function formatSlot(slot: DraftSlot) {
  return `${slot.start}-${slot.end}`;
}

function createEmptyTeacherMap(sectionIds: string[]) {
  return Object.fromEntries(sectionIds.map((sectionId) => [sectionId, { lec: "", lab: "" }]));
}

function createSubject(sectionIds: string[], name = ""): DraftSubject {
  return {
    id: makeId(),
    name,
    sessions: {
      lec: { frequency: 0 },
      lab: { frequency: 0 }
    },
    teachers: createEmptyTeacherMap(sectionIds)
  };
}

function serializeDraftPayload(draft: Draft | null) {
  if (!draft) return "";
  return JSON.stringify({
    name: draft.name,
    days: draft.days,
    slots: draft.slots,
    sections: draft.sections,
    teachers: draft.teachers,
    subjects: draft.subjects,
    rooms: draft.rooms,
    constraints: draft.constraints
  });
}

function toNonNegativeInt(value: string, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function getSubjectSessionCount(subject: DraftSubject) {
  return Number(subject.sessions.lec.frequency || 0) + Number(subject.sessions.lab.frequency || 0);
}

function buildEmptyGrid(days: string[], slots: string[], sectionIds: string[]) {
  const nextGrid: ManualGrid = {};

  days.forEach((day) => {
    nextGrid[day] = {};
    slots.forEach((slot) => {
      nextGrid[day][slot] = {};
      sectionIds.forEach((sectionId) => {
        nextGrid[day][slot][sectionId] = {};
      });
    });
  });

  return nextGrid;
}

function syncGridShape(
  currentGrid: ManualGrid,
  days: string[],
  slots: string[],
  sectionIds: string[],
  validBlockIds: Set<string>,
  validRoomIds: Set<string>
) {
  const nextGrid = buildEmptyGrid(days, slots, sectionIds);

  days.forEach((day) => {
    slots.forEach((slot) => {
      sectionIds.forEach((sectionId) => {
        const existing = currentGrid?.[day]?.[slot]?.[sectionId];
        if (existing?.blockId && validBlockIds.has(existing.blockId)) {
          nextGrid[day][slot][sectionId] = {
            blockId: existing.blockId,
            roomId: existing.roomId && validRoomIds.has(existing.roomId) ? existing.roomId : undefined
          };
        }
      });
    });
  });

  return nextGrid;
}

function buildBlockTemplates(draft: Draft | null) {
  if (!draft) return [];

  const teacherById = Object.fromEntries(draft.teachers.map((teacher) => [teacher.id, teacher.name]));

  return draft.sections.flatMap((section) =>
    draft.subjects.flatMap((subject) => {
      const mapping = subject.teachers[section.id] || {};
      const blocks: BlockTemplate[] = [];

      const lectureFrequency = Number(subject.sessions.lec.frequency || 0);
      if (lectureFrequency > 0 && mapping.lec && teacherById[mapping.lec]) {
        blocks.push({
          id: `${subject.id}-${section.id}-lec`,
          subject: subject.name,
          type: "lec",
          teacher: teacherById[mapping.lec],
          sectionId: section.id,
          sectionName: section.name,
          total: lectureFrequency
        });
      }

      const labFrequency = Number(subject.sessions.lab.frequency || 0);
      if (labFrequency > 0 && mapping.lab && teacherById[mapping.lab]) {
        blocks.push({
          id: `${subject.id}-${section.id}-lab`,
          subject: subject.name,
          type: "lab",
          teacher: teacherById[mapping.lab],
          sectionId: section.id,
          sectionName: section.name,
          total: labFrequency
        });
      }

      return blocks;
    })
  );
}

function findBlockIdForTimetableItem(
  item: any,
  blockTemplates: BlockTemplate[]
) {
  const sectionId = item.sectionId || item.section_id;
  const sessionType = item.type === "lecture" ? "lec" : item.type;

  const match = blockTemplates.find(
    (block) =>
      block.sectionId === sectionId &&
      block.subject === item.subject &&
      block.teacher === item.teacher &&
      block.type === sessionType
  );

  return match?.id;
}

function mapSolverToGrid(
  timetable: any[],
  days: string[],
  slots: DraftSlot[],
  sections: DraftEntity[],
  blockTemplates: BlockTemplate[]
) {
  const newGrid = buildEmptyGrid(
    days,
    slots.map((slot) => slot.id),
    sections.map((section) => section.id)
  );

  const slotByRange = new Map(slots.map((slot) => [`${slot.start}-${slot.end}`, slot.id]));

  for (const item of timetable || []) {
    const day = item.day;
    const sectionId = item.sectionId || item.section_id;
    const slotKey =
      item.slot && typeof item.slot === "string"
        ? item.slot
        : item.start_slot?.id || item.slot?.id || slotByRange.get(`${item.slot?.start}-${item.slot?.end}`);

    if (!day || !sectionId || !slotKey) {
      continue;
    }

    if (!newGrid[day]?.[slotKey]?.hasOwnProperty(sectionId)) {
      continue;
    }

    newGrid[day][slotKey][sectionId] = {
      blockId: findBlockIdForTimetableItem(item, blockTemplates),
      subject: item.subject,
      teacher: item.teacher,
      roomId: item.roomId || item.room,
      type: item.type === "lecture" ? "lec" : item.type,
      sectionId
    };
  }

  return newGrid;
}

function flattenManualGrid(grid: ManualGrid, draft: Draft, blocksById: Record<string, Block>) {
  const sectionNameById = Object.fromEntries(draft.sections.map((section) => [section.id, section.name]));

  return Object.entries(grid).flatMap(([day, slots]) =>
    Object.entries(slots).flatMap(([slotId, sections]) =>
      Object.entries(sections).flatMap(([sectionId, cell]) => {
        const block = cell.blockId ? blocksById[cell.blockId] : null;
        const subject = block?.subject || cell.subject;
        if (!subject) return [];

        return [{
          day,
          slot: slotId,
          sectionId,
          section: sectionNameById[sectionId] || sectionId,
          subject,
          teacher: block?.teacher || cell.teacher || "",
          roomId: cell.roomId || "",
          type: (block?.type || cell.type || "lec") === "lec" ? "lecture" : (block?.type || cell.type || "lab")
        }];
      })
    )
  );
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw data;
  }

  return data as T;
}

export default function EditorSetup() {
  useDocumentTitle("Create Timetable");

  const { toast } = useToast();
  const [, existingDraftParams] = useRoute("/editor/draft/:id");
  const existingDraftId = existingDraftParams?.id;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [saveError, setSaveError] = useState<DraftError | null>(null);
  const [solveError, setSolveError] = useState<DraftError | null>(null);
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const [newRoomType, setNewRoomType] = useState<"lecture" | "lab">("lecture");
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement>(null);
  const [manualGrid, setManualGrid] = useState<ManualGrid>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasSolvedOnce, setHasSolvedOnce] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const lastSavedSnapshot = useRef("");
  const lastSavedGridSnapshot = useRef("");
  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadDraft = async () => {
      try {
        const data = existingDraftId
          ? await requestJson<{ draft: Draft }>(`/draft/${existingDraftId}`)
          : await requestJson<{ draft: Draft }>("/draft", {
              method: "POST",
              body: JSON.stringify({ name: "Untitled Draft" })
            });

        if (cancelled) return;
        setManualGrid(data.draft.manualGrid || {});
        setDraft(data.draft);
        setDraftId(data.draft._id);
        lastSavedSnapshot.current = serializeDraftPayload(data.draft);
        lastSavedGridSnapshot.current = JSON.stringify(data.draft.manualGrid || {});
        hasLoadedDraft.current = true;
      } catch (error) {
        if (!cancelled) {
          setSaveError(error as DraftError);
        }
      } finally {
        if (!cancelled) {
          setIsCreating(false);
        }
      }
    };

    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [existingDraftId]);

  useEffect(() => {
    if (!draftId || !draft || !hasLoadedDraft.current) return;

    const snapshot = serializeDraftPayload(draft);
    if (snapshot === lastSavedSnapshot.current) return;

    setIsSaving(true);
    setSaveError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const data = await requestJson<{ draft: Draft }>(`/draft/${draftId}`, {
          method: "PATCH",
          body: snapshot
        });
        lastSavedSnapshot.current = serializeDraftPayload(data.draft);
      } catch (error) {
        setSaveError(error as DraftError);
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [draft, draftId]);

  useEffect(() => {
    if (!draftId || !hasLoadedDraft.current) return;

    const snapshot = JSON.stringify(manualGrid || {});
    if (snapshot === lastSavedGridSnapshot.current) return;

    setIsSaving(true);
    setSaveError(null);

    const timeout = window.setTimeout(async () => {
      try {
        await requestJson<{ draft: Draft }>(`/draft/${draftId}`, {
          method: "PATCH",
          body: JSON.stringify({
            manualGrid,
            lastEditedAt: new Date().toISOString()
          })
        });
        lastSavedGridSnapshot.current = snapshot;
      } catch (error) {
        setSaveError(error as DraftError);
      } finally {
        setIsSaving(false);
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [manualGrid, draftId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".share-container")) {
        setShowShare(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const solved = window.localStorage.getItem("tt3o-hasSolvedOnce");
    if (solved === "true") {
      setHasSolvedOnce(true);
      const savedSidebarOpen = window.localStorage.getItem("tt3o-sidebarOpen");
      setSidebarOpen(savedSidebarOpen === "true");
    } else {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (hasSolvedOnce) {
      window.localStorage.setItem("tt3o-hasSolvedOnce", "true");
      window.localStorage.setItem("tt3o-sidebarOpen", String(sidebarOpen));
      return;
    }

    window.localStorage.removeItem("tt3o-hasSolvedOnce");
    window.localStorage.removeItem("tt3o-sidebarOpen");
  }, [hasSolvedOnce, sidebarOpen]);

  const slotIds = useMemo(
    () => (draft?.slots || []).map((slot) => slot.id),
    [draft?.slots]
  );

  const slotLabelsById = useMemo(
    () => Object.fromEntries((draft?.slots || []).map((slot) => [slot.id, formatSlot(slot)])),
    [draft?.slots]
  );

  const blockTemplates = useMemo(() => buildBlockTemplates(draft), [draft]);
  const validBlockIds = useMemo(() => new Set(blockTemplates.map((block) => block.id)), [blockTemplates]);
  const validRoomIds = useMemo(() => new Set((draft?.rooms || []).map((room) => room.id)), [draft?.rooms]);

  useEffect(() => {
    if (!draft) {
      setManualGrid({});
      return;
    }

    setManualGrid((current) =>
      syncGridShape(
        current,
        draft.days,
        slotIds,
        draft.sections.map((section) => section.id),
        validBlockIds,
        validRoomIds
      )
    );
  }, [draft, slotIds, validBlockIds, validRoomIds]);

  const placementCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.values(manualGrid).forEach((slots) => {
      Object.values(slots).forEach((sections) => {
        Object.values(sections).forEach((cell) => {
          if (cell.blockId) {
            counts[cell.blockId] = (counts[cell.blockId] || 0) + 1;
          }
        });
      });
    });

    return counts;
  }, [manualGrid]);

  const blocks = useMemo<Block[]>(
    () =>
      blockTemplates.map((block) => ({
        id: block.id,
        subject: block.subject,
        type: block.type,
        teacher: block.teacher,
        sectionId: block.sectionId,
        remaining: Math.max(block.total - (placementCounts[block.id] || 0), 0)
      })),
    [blockTemplates, placementCounts]
  );

  const blocksById = useMemo(
    () => Object.fromEntries(blocks.map((block) => [block.id, block])),
    [blocks]
  );

  const blockMetaById = useMemo(
    () => Object.fromEntries(blockTemplates.map((block) => [block.id, block])),
    [blockTemplates]
  );

  const selectedBlock = selectedBlockId ? blocksById[selectedBlockId] || null : null;
  const allDaysSelected = draft ? draft.days.length === DAY_OPTIONS.length : false;
  const allSectionsVisible = draft ? visibleSections.length === draft.sections.length : true;

  useEffect(() => {
    if (!draft) return;
    const nextSectionIds = draft.sections.map((section) => section.id);
    setVisibleSections((current) => {
      if (current.length === 0) return nextSectionIds;
      const filtered = current.filter((sectionId) => nextSectionIds.includes(sectionId));
      if (filtered.length === 0) return nextSectionIds;
      return filtered;
    });
  }, [draft?.sections]);

  const requiredPerSection = useMemo(
    () => (draft?.subjects || []).reduce((sum, subject) => sum + getSubjectSessionCount(subject), 0),
    [draft?.subjects]
  );

  const availablePerSection = useMemo(
    () => (draft?.days.length || 0) * (draft?.slots.length || 0),
    [draft?.days.length, draft?.slots.length]
  );

  useEffect(() => {
    if (selectedBlockId && (!blocksById[selectedBlockId] || blocksById[selectedBlockId].remaining === 0)) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId, blocksById]);

  useEffect(() => {
    if (pendingPlacement && (!selectedBlockId || pendingPlacement.blockId !== selectedBlockId)) {
      setPendingPlacement(null);
    }
  }, [pendingPlacement, selectedBlockId]);

  const updateDraft = (updater: (current: Draft) => Draft) => {
    setDraft((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  const toggleDay = (day: string) => {
    updateDraft((current) => {
      const exists = current.days.includes(day);
      const nextDays = exists
        ? current.days.filter((item) => item !== day)
        : [...current.days, day].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b));

      return {
        ...current,
        days: nextDays
      };
    });
  };

  const toggleAllDays = () => {
    updateDraft((current) => ({
      ...current,
      days: current.days.length === DAY_OPTIONS.length ? [] : [...DAY_OPTIONS]
    }));
  };

  const toggleAllSections = () => {
    if (!draft) return;
    setVisibleSections((current) =>
      current.length === draft.sections.length ? [] : draft.sections.map((section) => section.id)
    );
  };

  const toggleVisibleSection = (sectionId: string) => {
    setVisibleSections((current) => {
      return current.includes(sectionId)
        ? current.filter((value) => value !== sectionId)
        : [...current, sectionId];
    });
  };

  const addSlot = () => {
    if (!newSlotStart || !newSlotEnd) return;
    updateDraft((current) => ({
      ...current,
      slots: [...current.slots, { id: makeId(), start: newSlotStart, end: newSlotEnd }]
    }));
    setNewSlotStart(newSlotEnd);
  };

  const addSection = () => {
    const name = newSectionName.trim();
    if (!name) return;

    const section = { id: makeId(), name };
    updateDraft((current) => ({
      ...current,
      sections: [...current.sections, section],
      subjects: current.subjects.map((subject) => ({
        ...subject,
        teachers: {
          ...subject.teachers,
          [section.id]: { lec: "", lab: "" }
        }
      }))
    }));
    setNewSectionName("");
  };

  const removeSection = (sectionId: string) => {
    updateDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
      subjects: current.subjects.map((subject) => {
        const nextTeachers = { ...subject.teachers };
        delete nextTeachers[sectionId];
        return {
          ...subject,
          teachers: nextTeachers
        };
      })
    }));
  };

  const addTeacher = () => {
    const name = newTeacherName.trim();
    if (!name) return;

    updateDraft((current) => ({
      ...current,
      teachers: [...current.teachers, { id: makeId(), name }]
    }));
    setNewTeacherName("");
  };

  const removeTeacher = (teacherId: string) => {
    updateDraft((current) => ({
      ...current,
      teachers: current.teachers.filter((teacher) => teacher.id !== teacherId),
      subjects: current.subjects.map((subject) => ({
        ...subject,
        teachers: Object.fromEntries(
          Object.entries(subject.teachers).map(([sectionId, mapping]) => [
            sectionId,
            {
              lec: mapping.lec === teacherId ? "" : mapping.lec,
              lab: mapping.lab === teacherId ? "" : mapping.lab
            }
          ])
        )
      }))
    }));
  };

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;

    updateDraft((current) => ({
      ...current,
      subjects: [...current.subjects, createSubject(current.sections.map((section) => section.id), name)]
    }));
    setNewSubjectName("");
  };

  const removeSubject = (subjectId: string) => {
    updateDraft((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== subjectId)
    }));
  };

  const addRoom = () => {
    const roomId = newRoomId.trim();
    if (!roomId) return;

    updateDraft((current) => ({
      ...current,
      rooms: [...current.rooms, { id: roomId, type: newRoomType }]
    }));
    setNewRoomId("");
    setNewRoomType("lecture");
  };

  const removeRoom = (roomId: string) => {
    updateDraft((current) => ({
      ...current,
      rooms: current.rooms.filter((room) => room.id !== roomId)
    }));
  };

  const getBlockRoomType = (block: Block) => (block.type === "lab" ? "lab" : "lecture");

  const isRoomBusy = (grid: ManualGrid, roomId: string, day: string, slot: string) =>
    Object.values(grid?.[day]?.[slot] || {}).some((cell) => cell?.roomId === roomId);

  const isTeacherBusy = (teacher: string, day: string, slot: string) =>
    Object.values(manualGrid?.[day]?.[slot] || {}).some((cell) => {
      if (!cell?.blockId) return false;
      const placedBlock = blocksById[cell.blockId];
      return placedBlock?.teacher === teacher;
    });

  const getAvailableRoomsForBlock = (block: Block | null, day: string, slot: string) => {
    if (!draft || !block) return [];
    const requiredType = getBlockRoomType(block);

    return draft.rooms.filter(
      (room) =>
        room.type === requiredType &&
        !isRoomBusy(manualGrid, room.id, day, slot)
    );
  };

  const isValidManualCell = (day: string, slot: string, sectionId: string) => {
    if (!selectedBlock) return false;
    if (selectedBlock.sectionId !== sectionId) return false;
    if (manualGrid?.[day]?.[slot]?.[sectionId]?.blockId) return false;
    if (isTeacherBusy(selectedBlock.teacher, day, slot)) return false;
    return getAvailableRoomsForBlock(selectedBlock, day, slot).length > 0;
  };

  const handleSolve = async () => {
    if (!draftId || !draft) return;
    const currentDraft = draft;

    setIsSolving(true);
    setSolveError(null);
    setSolveResult(null);

    try {
      const result = await requestJson<SolveResult>(`/draft/${draftId}/solve`, {
        method: "POST"
      });
      console.log(result.timetable);
      setSolveResult(result);
      setManualGrid(
        mapSolverToGrid(
          result.timetable || [],
          currentDraft.days,
          currentDraft.slots,
          currentDraft.sections,
          blockTemplates
        )
      );
      setPendingPlacement(null);
      setSelectedBlockId(null);
      setHasSolvedOnce(true);
      setSidebarOpen(false);
    } catch (error) {
      setSolveError(error as DraftError);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSelectBlock = (blockId: string) => {
    const block = blocksById[blockId];
    if (!block || block.remaining === 0) return;
    setPendingPlacement(null);
    setSelectedBlockId((current) => (current === blockId ? null : blockId));
  };

  const handleManualCellClick = (day: string, slot: string, sectionId: string) => {
    const existing = manualGrid?.[day]?.[slot]?.[sectionId];

    if (existing?.blockId) {
      setManualGrid((current) => ({
        ...current,
        [day]: {
          ...current[day],
          [slot]: {
            ...current[day][slot],
            [sectionId]: {}
          }
        }
      }));
      setPendingPlacement(null);
      setSelectedBlockId(null);
      return;
    }

    if (!selectedBlock || !isValidManualCell(day, slot, sectionId)) {
      return;
    }

    setPendingPlacement((current) => {
      if (
        current &&
        current.day === day &&
        current.timeSlot === slot &&
        current.sectionId === sectionId &&
        current.blockId === selectedBlock.id
      ) {
        return null;
      }

      return {
        day,
        timeSlot: slot,
        sectionId,
        blockId: selectedBlock.id
      };
    });
  };

  const handleAssignRoom = (day: string, slot: string, sectionId: string, roomId: string) => {
    if (!pendingPlacement || pendingPlacement.day !== day || pendingPlacement.timeSlot !== slot || pendingPlacement.sectionId !== sectionId) {
      return;
    }

    setManualGrid((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [slot]: {
          ...current[day][slot],
          [sectionId]: {
            blockId: pendingPlacement.blockId,
            roomId
          }
        }
      }
    }));
    setPendingPlacement(null);
    setSelectedBlockId(null);
  };

  const publishCurrentTimetable = async () => {
    if (!draft || !draftId) return null;

    setIsPublishing(true);
    try {
      const timetable = flattenManualGrid(manualGrid, draft, blocksById);
      const response = await requestJson<PublishResponse>("/timetable/publish", {
        method: "POST",
        body: JSON.stringify({
          draft_id: draftId,
          name: draft.name,
          days: draft.days,
          slots: draft.slots,
          sections: draft.sections,
          timetable,
          grid: manualGrid
        })
      });
      const nextShareUrl = `${window.location.origin}/t/${response.shareId}`;
      setShareUrl(nextShareUrl);
      return response.shareId;
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!shareUrl) {
        const shareId = await publishCurrentTimetable();
        if (!shareId) return;
      }
      setShowShare((current) => !current);
    } catch (error: any) {
      toast({ title: "Share failed", description: error?.message || "Unable to publish timetable." });
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied", description: shareUrl });
  };

  const handleExportSheets = () => {
    toast({ title: "Coming soon", description: "Export to Sheets is coming soon." });
  };

  const handleExportCalendar = () => {
    toast({ title: "Coming soon", description: "Export to Calendar is coming soon." });
  };

  if (isCreating || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Creating draft...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="border-b border-border bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl">Timetable Setup</h1>
            <Button type="button" variant="outline" size="sm" onClick={() => setSidebarOpen((prev) => !prev)}>
              {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Draft ID: {draftId}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="text-sm text-muted-foreground">{isSaving ? "Saving..." : "All changes saved"}</div>
          <div className="relative share-container">
            <Button variant="outline" onClick={handleShare} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              Share
            </Button>
            {showShare && shareUrl ? (
              <div className="absolute top-full right-0 mt-2 w-72 rounded-lg border border-border bg-white p-3 shadow-lg z-50">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground mb-2">Share Link</div>
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="h-9 text-sm" />
                  <Button type="button" size="sm" onClick={handleCopyShareLink}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={handleExportSheets} title="Coming soon">
            <ExternalLink className="w-4 h-4 mr-2" />
            Export to Sheets
          </Button>
          <Button variant="outline" onClick={handleExportCalendar} title="Coming soon">
            <ExternalLink className="w-4 h-4 mr-2" />
            Export to Calendar
          </Button>
          <Button onClick={handleSolve} disabled={isSolving}>
            {isSolving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Solve Draft
          </Button>
        </div>
      </header>

      <main className="h-[calc(100vh-92px)] p-4">
        <div className="flex h-full w-full gap-4">
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden shrink-0",
            sidebarOpen ? "w-1/5 min-w-[260px]" : "w-0 min-w-0"
          )}
        >
        {sidebarOpen ? <section className="h-full overflow-y-auto bg-white border border-border rounded-2xl p-5 space-y-6 shadow-sm">
          <div>
            <label className="text-sm font-medium text-foreground">Draft Name</label>
            <Input
              value={draft.name}
              onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Untitled Draft"
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Days</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={allDaysSelected} onChange={toggleAllDays} />
                Select All
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DAY_OPTIONS.map((day) => (
                <label key={day} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/60">
                  <input type="checkbox" checked={draft.days.includes(day)} onChange={() => toggleDay(day)} />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-lg">Time Slots</h2>
            </div>
            <div className="mb-3 flex w-full flex-col gap-2">
              <div className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={newSlotStart}
                  onChange={(event) => setNewSlotStart(event.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Input
                  type="time"
                  value={newSlotEnd}
                  onChange={(event) => setNewSlotEnd(event.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
              </div>
              <Button type="button" variant="outline" onClick={addSlot} className="w-full justify-center">
                Add Slot
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-3">
              {draft.slots.map((slot, index) => (
                <div key={slot.id} className="flex justify-between items-center gap-3 px-3 py-2 border rounded-md">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          slots: current.slots.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, start: event.target.value } : item
                          )
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          slots: current.slots.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, end: event.target.value } : item
                          )
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateDraft((current) => ({
                        ...current,
                        slots: current.slots.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Sections</h2>
            <div className="flex gap-2 mb-3">
              <Input value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} placeholder="Add section" />
              <Button type="button" variant="outline" onClick={addSection}>Add</Button>
            </div>
            <div className="space-y-2">
              {draft.sections.map((section) => (
                <div key={section.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <span>{section.name}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(section.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Teachers</h2>
            <div className="flex gap-2 mb-3">
              <Input value={newTeacherName} onChange={(event) => setNewTeacherName(event.target.value)} placeholder="Add teacher" />
              <Button type="button" variant="outline" onClick={addTeacher}>Add</Button>
            </div>
            <div className="space-y-2">
              {draft.teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <span>{teacher.name}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTeacher(teacher.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Subjects</h2>
            <div className="flex gap-2 mb-3">
              <Input value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} placeholder="Add subject" />
              <Button type="button" variant="outline" onClick={addSubject}>Add</Button>
            </div>
            <div className="space-y-4">
              {draft.subjects.map((subject) => (
                <div key={subject.id} className="rounded-xl border border-border/60 p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Input
                      value={subject.name}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          subjects: current.subjects.map((item) =>
                            item.id === subject.id ? { ...item, name: event.target.value } : item
                          )
                        }))
                      }
                      placeholder="Subject name"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(subject.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-sm">
                      <span className="block text-muted-foreground mb-1">Lecture freq</span>
                      <Input
                        type="number"
                        min={0}
                        value={subject.sessions.lec.frequency}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            subjects: current.subjects.map((item) =>
                              item.id === subject.id
                                ? {
                                    ...item,
                                    sessions: {
                                      ...item.sessions,
                                      lec: { frequency: toNonNegativeInt(event.target.value) }
                                    }
                                  }
                                : item
                            )
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block text-muted-foreground mb-1">Lab freq</span>
                      <Input
                        type="number"
                        min={0}
                        value={subject.sessions.lab.frequency}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            subjects: current.subjects.map((item) =>
                              item.id === subject.id
                                ? {
                                    ...item,
                                    sessions: {
                                      ...item.sessions,
                                      lab: { frequency: toNonNegativeInt(event.target.value) }
                                    }
                                  }
                                : item
                            )
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">Teacher mapping by section</div>
                    {draft.sections.length === 0 ? (
                      <div className="text-sm text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">
                        Add at least one section before assigning teachers.
                      </div>
                    ) : (
                      draft.sections.map((section) => {
                        const mapping = subject.teachers[section.id] || { lec: "", lab: "" };
                        return (
                          <div key={section.id} className="w-full overflow-hidden rounded-lg border border-border/50 p-3">
                            <div className="flex flex-col gap-2">
                              <div className="text-sm font-medium">{section.name}</div>
                              <div className="flex w-full flex-col gap-2">
                                <select
                                  className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                                  value={mapping.lec || ""}
                                  onChange={(event) =>
                                    updateDraft((current) => ({
                                      ...current,
                                      subjects: current.subjects.map((item) =>
                                        item.id === subject.id
                                          ? {
                                              ...item,
                                              teachers: {
                                                ...item.teachers,
                                                [section.id]: {
                                                  ...(item.teachers[section.id] || { lec: "", lab: "" }),
                                                  lec: event.target.value
                                                }
                                              }
                                            }
                                          : item
                                      )
                                    }))
                                  }
                                >
                                  <option value="">Lecture teacher</option>
                                  {draft.teachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                      {teacher.name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                                  value={mapping.lab || ""}
                                  onChange={(event) =>
                                    updateDraft((current) => ({
                                      ...current,
                                      subjects: current.subjects.map((item) =>
                                        item.id === subject.id
                                          ? {
                                              ...item,
                                              teachers: {
                                                ...item.teachers,
                                                [section.id]: {
                                                  ...(item.teachers[section.id] || { lec: "", lab: "" }),
                                                  lab: event.target.value
                                                }
                                              }
                                            }
                                          : item
                                      )
                                    }))
                                  }
                                >
                                  <option value="">Lab teacher</option>
                                  {draft.teachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                      {teacher.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Rooms</h2>
            <div className="mb-3 flex w-full flex-col gap-2">
              <div className="flex w-full gap-2 items-center">
                <Input
                  value={newRoomId}
                  onChange={(event) => setNewRoomId(event.target.value)}
                  placeholder="Room ID"
                  className="flex-1 min-w-[140px] px-3 py-2 border rounded-md"
                />
                <select
                  className="w-[110px] px-2 py-2 border rounded-md text-center"
                  value={newRoomType}
                  onChange={(event) => setNewRoomType(event.target.value as "lecture" | "lab")}
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                </select>
              </div>
              <Button type="button" variant="outline" onClick={addRoom} className="w-full justify-center">
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {draft.rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <span>{room.id}</span>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {room.type}
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRoom(room.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-3">Constraints</h2>
            <div className="space-y-2 text-sm">
              {[
                { key: "noConsecutiveClasses", label: "No consecutive classes" },
                { key: "avoidGaps", label: "Avoid gaps" },
                { key: "labAfterLecture", label: "Lab after lecture" }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 bg-muted/20">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.constraints[item.key as keyof Draft["constraints"]])}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        constraints: {
                          ...current.constraints,
                          [item.key]: event.target.checked
                        }
                      }))
                    }
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {(saveError?.message || saveError?.errors?.length) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-medium mb-2">Save issue</div>
              {saveError.message && <p>{saveError.message}</p>}
              <ul className="mt-2 space-y-1">
                {saveError.errors?.map((error) => (
                  <li key={`${error.field}-${error.code}`}>{error.field}: {error.message}</li>
                ))}
              </ul>
            </div>
          )}
        </section> : null}
        </div>

        <section className={cn(
          "min-w-[260px] bg-white border border-border rounded-2xl p-4 shadow-sm h-full overflow-y-auto",
          sidebarOpen ? "w-1/5" : "w-1/4"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-xl">Manual Builder</h2>
              <p className="text-sm text-muted-foreground">
                Per section capacity: {availablePerSection} slots. Required: {requiredPerSection} sessions. Select a block, click a green cell, then choose a room.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3 mb-4">
            <div className="text-sm font-semibold text-slate-900">Visible sections</div>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={allSectionsVisible} onChange={toggleAllSections} />
              All Sections
            </label>
            <div className="mt-2 space-y-2">
              {draft.sections.map((section) => (
                <label key={section.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={visibleSections.includes(section.id)}
                    onChange={() => toggleVisibleSection(section.id)}
                  />
                  {section.name}
                </label>
              ))}
            </div>
          </div>

          <aside className="w-full max-w-full rounded-2xl border border-border bg-slate-50 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-base">Blocks</h3>
                <div className="text-xs text-muted-foreground">{blocks.length} total</div>
              </div>

              {blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Add sections, subjects, teacher mappings, and rooms to generate blocks.
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block) => {
                    const meta = blockMetaById[block.id];
                    const disabled = block.remaining === 0;
                    const selected = selectedBlockId === block.id;

                    return (
                      <button
                        key={block.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectBlock(block.id)}
                        className={cn(
                          "w-full max-w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all",
                          disabled
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                          selected && "border-emerald-500 ring-2 ring-emerald-200 shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {block.type === "lab" ? "Lab" : "Lecture"} · {meta?.sectionName || block.sectionId}
                              </div>
                              <div className="mt-1 font-semibold text-slate-900 truncate">{block.subject}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">{block.teacher}</div>
                            </div>
                          <div
                            className={cn(
                              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                              disabled ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {block.remaining} left
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            <div className="mt-4 rounded-xl border border-dashed border-border bg-white/80 px-4 py-3 text-xs text-slate-500">
              Filled cells can be clicked to remove a block. Teacher and room conflicts are blocked per slot.
            </div>
          </aside>

          {solveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-medium mb-2">Solve issue</div>
              {solveError.message && <p>{solveError.message}</p>}
              {solveError.errors?.length ? (
                <ul className="mt-2 space-y-1">
                  {solveError.errors.map((error) => (
                    <li key={`${error.field}-${error.code}`}>{error.field}: {error.message}</li>
                  ))}
                </ul>
              ) : null}
              {solveError.reasons?.length ? (
                <ul className="mt-2 space-y-1">
                  {solveError.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {solveResult?.status === "POSSIBLE" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Solver run completed. Room assignments are included in solver output.
            </div>
          ) : null}
        </section>
        <section className={cn(
          "min-w-0 rounded-2xl border border-border bg-slate-50 p-2 shadow-sm h-full overflow-hidden",
          sidebarOpen ? "w-3/5" : "flex-1"
        )}>
          <TimetableGrid
            days={draft.days}
            timeSlots={slotIds}
            slotLabels={slotLabelsById}
            sections={draft.sections}
            rooms={draft.rooms}
            manualGrid={manualGrid}
            blocksById={blocksById}
            selectedBlockId={selectedBlockId}
            pendingPlacement={pendingPlacement}
            visibleSectionIds={visibleSections}
            isValidCell={isValidManualCell}
            getAvailableRoomsForCell={(day, slot, sectionId) => {
              const blockId = pendingPlacement?.day === day && pendingPlacement?.timeSlot === slot && pendingPlacement?.sectionId === sectionId
                ? pendingPlacement.blockId
                : selectedBlockId;
              const block = blockId ? blocksById[blockId] : null;
              return getAvailableRoomsForBlock(block || null, day, slot);
            }}
            onCellClick={handleManualCellClick}
            onAssignRoom={handleAssignRoom}
            onCancelPlacement={() => setPendingPlacement(null)}
          />
        </section>
        </div>
      </main>
    </div>
  );
}
