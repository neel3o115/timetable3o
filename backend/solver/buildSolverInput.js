function ensureDraftShape(draft) {
  if (!draft || typeof draft !== "object") {
    throw new Error("Draft input is required");
  }

  if (!Array.isArray(draft.days) || !Array.isArray(draft.slots)) {
    throw new Error("Draft must include days and slots");
  }
}

function getFrequency(subject, key) {
  const raw = Number(subject?.sessions?.[key]?.frequency || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function getTeacherMapping(subject, sectionId, sessionType) {
  const mapping = subject?.teachers?.[sectionId];
  if (!mapping || typeof mapping !== "object") {
    return null;
  }
  return mapping[sessionType] || null;
}

function mapSoftConstraints(constraints = {}) {
  const soft = [];
  if (constraints.noConsecutiveClasses) soft.push("no_consecutive_classes");
  if (constraints.avoidGaps) soft.push("avoid_gaps");
  if (constraints.labAfterLecture) soft.push("lab_after_lecture");
  return soft;
}

function normalizeRoomType(sessionType) {
  return sessionType === "lab" ? "lab" : "lecture";
}

export function buildSolverInput(draft) {
  ensureDraftShape(draft);

  const teacherById = new Map((draft.teachers || []).map((teacher) => [teacher.id, teacher]));
  const rooms = (draft.rooms || []).map((room) => ({
    id: room.id,
    type: room.type
  }));
  const sessions = [];

  for (const section of draft.sections || []) {
    for (const subject of draft.subjects || []) {
      const lectureTeacherId = getTeacherMapping(subject, section.id, "lec");
      const labTeacherId = getTeacherMapping(subject, section.id, "lab");

      const lectureTeacher = lectureTeacherId ? teacherById.get(lectureTeacherId) : null;
      const labTeacher = labTeacherId ? teacherById.get(labTeacherId) : null;

      const lectureFrequency = getFrequency(subject, "lec");
      const labFrequency = getFrequency(subject, "lab");

      if (lectureFrequency > 0 && !lectureTeacher) {
        throw new Error(`Missing lecture teacher for ${subject.name} in ${section.name}`);
      }

      if (labFrequency > 0 && !labTeacher) {
        throw new Error(`Missing lab teacher for ${subject.name} in ${section.name}`);
      }

      for (let index = 0; index < lectureFrequency; index += 1) {
        sessions.push({
          id: `${subject.id}-${section.id}-lec-${index + 1}`,
          section: section.name,
          section_id: section.id,
          subject: subject.name,
          subject_id: subject.id,
          type: "lecture",
          required_room_type: normalizeRoomType("lecture"),
          teacher: lectureTeacher.name,
          teacher_id: lectureTeacher.id,
          duration: 1
        });
      }

      for (let index = 0; index < labFrequency; index += 1) {
        sessions.push({
          id: `${subject.id}-${section.id}-lab-${index + 1}`,
          section: section.name,
          section_id: section.id,
          subject: subject.name,
          subject_id: subject.id,
          type: "lab",
          required_room_type: normalizeRoomType("lab"),
          teacher: labTeacher.name,
          teacher_id: labTeacher.id,
          duration: 1
        });
      }
    }
  }

  const teachers = {};
  (draft.teachers || []).forEach((teacher) => {
    teachers[teacher.name] = {
      id: teacher.id,
      availability: { type: "always" }
    };
  });

  return {
    time: {
      days: [...(draft.days || [])],
      slots: [...(draft.slots || [])]
    },
    sections: (draft.sections || []).map((section) => ({
      id: section.id,
      name: section.name
    })),
    sessions,
    teachers,
    rooms,
    constraints: {
      hard: [
        "teacher_no_overlap",
        "section_no_overlap",
        "room_no_overlap"
      ],
      soft: mapSoftConstraints(draft.constraints)
    }
  };
}
