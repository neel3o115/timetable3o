const VALID_DAYS = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);
const ROOM_TYPES = new Set(["lecture", "lab"]);

const TIME_RE = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const BOOLEAN_FIELDS = ["noConsecutiveClasses", "avoidGaps", "labAfterLecture"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushError(errors, field, code, message) {
  errors.push({ field, code, message });
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateNamedEntities(items, field, errors, { requireComplete }) {
  if (!Array.isArray(items)) {
    pushError(errors, field, "INVALID_TYPE", `${field} must be an array`);
    return;
  }

  if (requireComplete && items.length === 0) {
    pushError(errors, field, "REQUIRED", `${field} must contain at least one item`);
  }

  const seenIds = new Set();
  const seenNames = new Set();

  items.forEach((item, index) => {
    const itemField = `${field}[${index}]`;

    if (!isPlainObject(item)) {
      pushError(errors, itemField, "INVALID_TYPE", `${itemField} must be an object`);
      return;
    }

    if (!isNonEmptyString(item.id)) {
      pushError(errors, `${itemField}.id`, "REQUIRED", `${itemField}.id is required`);
    } else if (seenIds.has(item.id)) {
      pushError(errors, `${itemField}.id`, "DUPLICATE_ID", `${field} IDs must be unique`);
    } else {
      seenIds.add(item.id);
    }

    if (!isNonEmptyString(item.name)) {
      pushError(errors, `${itemField}.name`, "REQUIRED", `${itemField}.name is required`);
    } else {
      const normalizedName = item.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        pushError(errors, `${itemField}.name`, "DUPLICATE_NAME", `${field} names must be unique`);
      } else {
        seenNames.add(normalizedName);
      }
    }
  });
}

function validateDays(days, errors, { requireComplete }) {
  if (!Array.isArray(days)) {
    pushError(errors, "days", "INVALID_TYPE", "days must be an array");
    return;
  }

  if (requireComplete && days.length === 0) {
    pushError(errors, "days", "REQUIRED", "days must contain at least one day");
  }

  const seen = new Set();
  days.forEach((day, index) => {
    const field = `days[${index}]`;
    if (!isNonEmptyString(day)) {
      pushError(errors, field, "INVALID_DAY", "day must be a non-empty string");
      return;
    }
    if (!VALID_DAYS.has(day)) {
      pushError(errors, field, "INVALID_DAY", `Unsupported day: ${day}`);
    }
    if (seen.has(day)) {
      pushError(errors, field, "DUPLICATE_DAY", `Duplicate day: ${day}`);
    }
    seen.add(day);
  });
}

function validateSlots(slots, errors, { requireComplete }) {
  if (!Array.isArray(slots)) {
    pushError(errors, "slots", "INVALID_TYPE", "slots must be an array");
    return;
  }

  if (requireComplete && slots.length === 0) {
    pushError(errors, "slots", "REQUIRED", "slots must contain at least one slot");
  }

  const seenIds = new Set();
  const seenRanges = new Set();

  slots.forEach((slot, index) => {
    const field = `slots[${index}]`;
    if (!isPlainObject(slot)) {
      pushError(errors, field, "INVALID_TYPE", `${field} must be an object`);
      return;
    }

    if (!isNonEmptyString(slot.id)) {
      pushError(errors, `${field}.id`, "REQUIRED", `${field}.id is required`);
    } else if (seenIds.has(slot.id)) {
      pushError(errors, `${field}.id`, "DUPLICATE_ID", "Slot IDs must be unique");
    } else {
      seenIds.add(slot.id);
    }

    if (!TIME_RE.test(slot.start || "")) {
      pushError(errors, `${field}.start`, "INVALID_TIME", `${field}.start must use HH:mm format`);
    }

    if (!TIME_RE.test(slot.end || "")) {
      pushError(errors, `${field}.end`, "INVALID_TIME", `${field}.end must use HH:mm format`);
    }

    if (TIME_RE.test(slot.start || "") && TIME_RE.test(slot.end || "") && slot.start >= slot.end) {
      pushError(errors, field, "INVALID_RANGE", `${field} start must be earlier than end`);
    }

    const slotKey = `${slot.start || ""}-${slot.end || ""}`;
    if (seenRanges.has(slotKey)) {
      pushError(errors, field, "DUPLICATE_SLOT", `Duplicate slot: ${slotKey}`);
    } else {
      seenRanges.add(slotKey);
    }
  });
}

function getFrequency(config) {
  const raw = Number(config?.frequency ?? 0);
  return Number.isFinite(raw) ? raw : NaN;
}

function validateRooms(rooms, draft, errors, { requireComplete }) {
  if (!Array.isArray(rooms)) {
    pushError(errors, "rooms", "INVALID_TYPE", "rooms must be an array");
    return;
  }

  const seenIds = new Set();
  let lectureRooms = 0;
  let labRooms = 0;

  rooms.forEach((room, index) => {
    const field = `rooms[${index}]`;
    if (!isPlainObject(room)) {
      pushError(errors, field, "INVALID_TYPE", `${field} must be an object`);
      return;
    }

    if (!isNonEmptyString(room.id)) {
      pushError(errors, `${field}.id`, "REQUIRED", `${field}.id is required`);
    } else if (seenIds.has(room.id)) {
      pushError(errors, `${field}.id`, "DUPLICATE_ID", "Room IDs must be unique");
    } else {
      seenIds.add(room.id);
    }

    if (!isNonEmptyString(room.type) || !ROOM_TYPES.has(room.type)) {
      pushError(errors, `${field}.type`, "INVALID_TYPE", `${field}.type must be lecture or lab`);
      return;
    }

    if (room.type === "lecture") {
      lectureRooms += 1;
    } else if (room.type === "lab") {
      labRooms += 1;
    }
  });

  if (requireComplete && lectureRooms < 1) {
    pushError(errors, "rooms", "REQUIRED", "At least one lecture room is required");
  }

  const labRequired = Array.isArray(draft?.subjects)
    ? draft.subjects.reduce((sum, subject) => sum + Math.max(getFrequency(subject.sessions?.lab) || 0, 0), 0)
    : 0;

  if (labRequired > 0 && labRooms < 1) {
    pushError(errors, "rooms", "INSUFFICIENT_LABS", "At least one lab room is required when lab sessions are configured");
  }
}

function validateConstraints(constraints, errors) {
  if (constraints === undefined || constraints === null) {
    return;
  }

  if (!isPlainObject(constraints)) {
    pushError(errors, "constraints", "INVALID_TYPE", "constraints must be an object");
    return;
  }

  BOOLEAN_FIELDS.forEach((key) => {
    if (constraints[key] !== undefined && typeof constraints[key] !== "boolean") {
      pushError(errors, `constraints.${key}`, "INVALID_TYPE", `${key} must be a boolean`);
    }
  });
}

function validateManualGrid(manualGrid, errors) {
  if (manualGrid === undefined || manualGrid === null) {
    return;
  }

  if (!isPlainObject(manualGrid)) {
    pushError(errors, "manualGrid", "INVALID_TYPE", "manualGrid must be an object");
  }
}

function validateSubjects(draft, errors, { requireComplete }) {
  const { subjects, teachers, sections } = draft;

  if (!Array.isArray(subjects)) {
    pushError(errors, "subjects", "INVALID_TYPE", "subjects must be an array");
    return;
  }

  if (requireComplete && subjects.length === 0) {
    pushError(errors, "subjects", "REQUIRED", "subjects must contain at least one item");
  }

  const teacherList = Array.isArray(teachers) ? teachers : [];
  const sectionList = Array.isArray(sections) ? sections : [];
  const teacherIds = new Set(teacherList.map((teacher) => teacher.id));
  const sectionIds = new Set(sectionList.map((section) => section.id));
  const seenIds = new Set();
  const seenNames = new Set();

  subjects.forEach((subject, index) => {
    const field = `subjects[${index}]`;

    if (!isPlainObject(subject)) {
      pushError(errors, field, "INVALID_TYPE", `${field} must be an object`);
      return;
    }

    if (!isNonEmptyString(subject.id)) {
      pushError(errors, `${field}.id`, "REQUIRED", `${field}.id is required`);
    } else if (seenIds.has(subject.id)) {
      pushError(errors, `${field}.id`, "DUPLICATE_ID", "Subject IDs must be unique");
    } else {
      seenIds.add(subject.id);
    }

    if (!isNonEmptyString(subject.name)) {
      pushError(errors, `${field}.name`, "REQUIRED", `${field}.name is required`);
    } else {
      const normalizedName = subject.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        pushError(errors, `${field}.name`, "DUPLICATE_NAME", "Subject names must be unique");
      } else {
        seenNames.add(normalizedName);
      }
    }

    if (!isPlainObject(subject.sessions)) {
      if (requireComplete) {
        pushError(errors, `${field}.sessions`, "REQUIRED", `${field}.sessions is required`);
      }
    } else {
      const lecFrequency = getFrequency(subject.sessions.lec);
      const labFrequency = getFrequency(subject.sessions.lab);
      const hasPositiveLec = Number.isFinite(lecFrequency) && lecFrequency > 0;
      const hasPositiveLab = Number.isFinite(labFrequency) && labFrequency > 0;

      if (subject.sessions.lec !== undefined && !isNonNegativeInteger(lecFrequency)) {
        pushError(errors, `${field}.sessions.lec.frequency`, "INVALID_VALUE", "Lecture frequency must be 0 or greater");
      }

      if (subject.sessions.lab !== undefined && !isNonNegativeInteger(labFrequency)) {
        pushError(errors, `${field}.sessions.lab.frequency`, "INVALID_VALUE", "Lab frequency must be 0 or greater");
      }

      if (requireComplete && !hasPositiveLec && !hasPositiveLab) {
        pushError(errors, `${field}.sessions`, "REQUIRED", "Each subject must have at least one lecture or lab frequency greater than 0");
      }
    }

    const subjectTeachers = subject.teachers;
    if (subjectTeachers !== undefined && !isPlainObject(subjectTeachers)) {
      pushError(errors, `${field}.teachers`, "INVALID_TYPE", `${field}.teachers must be an object keyed by sectionId`);
      return;
    }

    Object.entries(subjectTeachers || {}).forEach(([sectionId, mapping]) => {
      const mappingField = `${field}.teachers.${sectionId}`;

      if (!sectionIds.has(sectionId)) {
        pushError(errors, mappingField, "INVALID_REFERENCE", `Unknown section id: ${sectionId}`);
      }

      if (!isPlainObject(mapping)) {
        pushError(errors, mappingField, "INVALID_TYPE", `${mappingField} must be an object`);
        return;
      }

      ["lec", "lab"].forEach((sessionType) => {
        const teacherId = mapping[sessionType];
        if (teacherId === undefined || teacherId === null || teacherId === "") {
          return;
        }
        if (!teacherIds.has(teacherId)) {
          pushError(errors, `${mappingField}.${sessionType}`, "INVALID_REFERENCE", `${mappingField}.${sessionType} must reference a valid teacher`);
        }
      });
    });

    if (requireComplete) {
      const lecFrequency = getFrequency(subject.sessions?.lec);
      const labFrequency = getFrequency(subject.sessions?.lab);

      sectionList.forEach((section, sectionIndex) => {
        const mapping = subjectTeachers?.[section.id];
        const mappingField = `${field}.teachers.${section.id || sectionIndex}`;

        if (!mapping || !isPlainObject(mapping)) {
          pushError(errors, mappingField, "REQUIRED", `Teacher mapping is required for section ${section.name}`);
          return;
        }

        if (Number.isFinite(lecFrequency) && lecFrequency > 0 && !isNonEmptyString(mapping.lec)) {
          pushError(errors, `${mappingField}.lec`, "REQUIRED", `Lecture teacher is required for section ${section.name}`);
        } else if (isNonEmptyString(mapping.lec) && !teacherIds.has(mapping.lec)) {
          pushError(errors, `${mappingField}.lec`, "INVALID_REFERENCE", `Lecture teacher for section ${section.name} is invalid`);
        }

        if (Number.isFinite(labFrequency) && labFrequency > 0 && !isNonEmptyString(mapping.lab)) {
          pushError(errors, `${mappingField}.lab`, "REQUIRED", `Lab teacher is required for section ${section.name}`);
        } else if (isNonEmptyString(mapping.lab) && !teacherIds.has(mapping.lab)) {
          pushError(errors, `${mappingField}.lab`, "INVALID_REFERENCE", `Lab teacher for section ${section.name} is invalid`);
        }
      });
    }
  });
}

function validateCapacity(draft, errors, { requireComplete }) {
  if (!Array.isArray(draft.days) || !Array.isArray(draft.slots) || !Array.isArray(draft.sections) || !Array.isArray(draft.subjects)) {
    return;
  }

  const availablePerSection = draft.days.length * draft.slots.length;
  if (!availablePerSection) {
    return;
  }

  draft.sections.forEach((section, index) => {
    const required = draft.subjects.reduce((sum, subject) => {
      const lec = Math.max(getFrequency(subject.sessions?.lec) || 0, 0);
      const lab = Math.max(getFrequency(subject.sessions?.lab) || 0, 0);
      return sum + lec + lab;
    }, 0);

    if ((requireComplete || required > 0) && required > availablePerSection) {
      pushError(
        errors,
        `sections[${index}]`,
        "CAPACITY_EXCEEDED",
        `Section ${section.name} requires ${required} sessions but only ${availablePerSection} slots are available`
      );
    }
  });

}

export function validateDraft(draft, options = {}) {
  const { requireComplete = false } = options;
  const errors = [];

  if (!isPlainObject(draft)) {
    return {
      valid: false,
      errors: [
        {
          field: "draft",
          code: "INVALID_TYPE",
          message: "draft must be an object"
        }
      ]
    };
  }

  validateDays(draft.days, errors, { requireComplete });
  validateSlots(draft.slots, errors, { requireComplete });
  validateNamedEntities(draft.sections, "sections", errors, { requireComplete });
  validateNamedEntities(draft.teachers, "teachers", errors, { requireComplete });
  validateSubjects(draft, errors, { requireComplete });
  validateRooms(draft.rooms, draft, errors, { requireComplete });
  validateManualGrid(draft.manualGrid, errors);
  validateConstraints(draft.constraints, errors);
  validateCapacity(draft, errors, { requireComplete });

  return {
    valid: errors.length === 0,
    errors
  };
}
