export function validateBaseConstraints(state) {
  const errors = [];

  // ---- DAYS ----
  if (!Array.isArray(state.days) || state.days.length === 0) {
    errors.push("at least one day must be specified");
  }

  // ---- TIME SLOTS ----
  if (!Array.isArray(state.time_slots) || state.time_slots.length === 0) {
    errors.push("at least one time slot must be specified");
  } else {
    state.time_slots.forEach((slot, i) => {
      if (typeof slot !== "object" || !slot.start || !slot.end) {
        errors.push(`time slot ${i} must be an object with start and end times`);
      } else {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
          errors.push(`time slot ${i} must use HH:mm format (e.g., 09:00)`);
        } else if (slot.start >= slot.end) {
          errors.push(`time slot ${i} start time must be before end time`);
        }
      }
    });
  }

  // ---- SECTIONS ----
  if (!Array.isArray(state.sections) || state.sections.length === 0) {
    errors.push("at least one section must be specified");
  }

  // ---- SUBJECTS ----
  if (!state.subjects || Object.keys(state.subjects).length === 0) {
    errors.push("at least one subject must be specified");
  } else {
    Object.entries(state.subjects).forEach(([name, subject]) => {
      const hasLectures = subject.lectures_per_week > 0;
      const hasLabs = subject.labs_per_week > 0;

      if (!hasLectures && !hasLabs) {
        errors.push(
          `subject ${name} must have at least one lecture or lab`
        );
      }
    });
  }

  // ---- TEACHERS (with availability) ----
  if (!state.teachers || Object.keys(state.teachers).length === 0) {
    errors.push("At least one teacher must be specified");
  } else {
    Object.entries(state.teachers).forEach(([name, teacher]) => {
      if (!Array.isArray(teacher.teaches) || teacher.teaches.length === 0) {
        errors.push(`Teacher ${name} must teach at least one subject`);
      }

      const avail = teacher.availability;
      if (!avail) {
        errors.push(`Teacher ${name} is missing availability`);
      } else {
        if (!["always", "days", "time_slots"].includes(avail.type)) {
          errors.push(`Teacher ${name} has invalid availability type: ${avail.type}`);
        }

        if (avail.type === "days") {
          if (!Array.isArray(avail.days) || avail.days.length === 0) {
            errors.push(`Teacher ${name} has type "days" but no days specified`);
          }
        }

        if (avail.type === "time_slots") {
          if (!Array.isArray(avail.time_slots) || avail.time_slots.length === 0) {
            errors.push(`Teacher ${name} has type "time_slots" but no time_slots specified`);
          }
        }
      }
    });
  }

  // ---- ROOMS ----
  if (!state.rooms || Object.keys(state.rooms).length === 0) {
    errors.push("Room information must be specified");
  } else {
    const totalRooms = Object.values(state.rooms)
      .reduce((sum, v) => sum + v, 0);

    if (totalRooms <= 0) {
      errors.push("At least one room must be available");
    }
  }

  return errors;
}