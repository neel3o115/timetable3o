/**
 * Normalizes a single teacher's availability object to the canonical schema.
 * 
 * Canonical Schema:
 * {
 *   type: "always" | "days" | "time_slots",
 *   days?: string[],
 *   time_slots?: [{ start: "HH:mm", end: "HH:mm" }]
 * }
 */
export function normalizeTeacherAvailability(availability) {
    if (!availability || typeof availability !== "object") {
        return { type: "always" };
    }

    const { type, days, time_slots, slots } = availability;

    // 1. If type is already canonical, just ensure fields are present if needed
    if (type === "always") return { type: "always" };

    if (type === "days") {
        return {
            type: "days",
            days: Array.isArray(days) ? days : []
        };
    }

    if (type === "time_slots") {
        return {
            type: "time_slots",
            time_slots: Array.isArray(time_slots) ? time_slots : (Array.isArray(slots) ? slots : []),
            days: Array.isArray(days) ? days : undefined
        };
    }

    // 2. Map legacy types
    if (type === "full") return { type: "always" };
    if (type === "custom") {
        if (Array.isArray(time_slots) || Array.isArray(slots)) {
            return {
                type: "time_slots",
                time_slots: Array.isArray(time_slots) ? time_slots : slots,
                days: Array.isArray(days) ? days : undefined
            };
        }
        if (Array.isArray(days)) {
            return { type: "days", days };
        }
        return { type: "always" };
    }

    // 3. Infer from fields if type is missing
    if (Array.isArray(time_slots) || Array.isArray(slots)) {
        return {
            type: "time_slots",
            time_slots: Array.isArray(time_slots) ? time_slots : slots,
            days: Array.isArray(days) ? days : undefined
        };
    }
    if (Array.isArray(days)) {
        return { type: "days", days };
    }

    // Default fallback
    return { type: "always" };
}

/**
 * Normalizes all teachers' availability in the constraints object.
 */
export function normalizeAllTeachers(teachers = {}) {
    const normalized = {};
    Object.entries(teachers).forEach(([name, data]) => {
        normalized[name] = {
            ...data,
            availability: normalizeTeacherAvailability(data.availability)
        };
    });
    return normalized;
}
