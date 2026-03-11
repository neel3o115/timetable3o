import sys
import json
from ortools.sat.python import cp_model


def slot_signature(slot):
    if isinstance(slot, str):
        return slot
    if isinstance(slot, dict):
        return json.dumps(slot, sort_keys=True)
    return None


def session_duration(session):
    try:
        return max(int(session.get("duration", 1)), 1)
    except Exception:
        return 1


def session_type(session):
    raw = str(session.get("type", "lecture")).lower()
    if raw in ("lec", "lecture"):
        return "lecture"
    if raw in ("lab", "laboratory"):
        return "lab"
    return raw


def room_type(room):
    return str(room.get("type", "")).lower()


def allowed_room_indices(session, rooms):
    expected = session_type(session)
    return [index for index, room in enumerate(rooms) if room_type(room) == expected]


def build_debug_info(data):
    days = data["time"]["days"]
    slots = data["time"]["slots"]
    sessions = data["sessions"]
    rooms = data["rooms"]

    total_slots = len(days) * len(slots)
    total_sessions = len(sessions)
    total_required_slots = sum(session_duration(s) for s in sessions)

    lecture_rooms = sum(1 for room in rooms if room_type(room) == "lecture")
    lab_rooms = sum(1 for room in rooms if room_type(room) == "lab")

    lecture_sessions = sum(session_duration(s) for s in sessions if session_type(s) == "lecture")
    lab_sessions = sum(session_duration(s) for s in sessions if session_type(s) == "lab")

    lecture_capacity = total_slots * lecture_rooms
    lab_capacity = total_slots * lab_rooms

    return {
        "total_slots": total_slots,
        "total_sessions": total_sessions,
        "total_required_slots": total_required_slots,
        "lecture_rooms": lecture_rooms,
        "lab_rooms": lab_rooms,
        "lecture_sessions": lecture_sessions,
        "lab_sessions": lab_sessions,
        "lecture_capacity": lecture_capacity,
        "lab_capacity": lab_capacity,
    }


def explain_impossible(data):
    days = data["time"]["days"]
    slots = data["time"]["slots"]
    sessions = data["sessions"]
    teachers = data["teachers"]
    rooms = data["rooms"]

    explanations = []
    debug = build_debug_info(data)
    total_slots = debug["total_slots"]
    lecture_rooms = debug["lecture_rooms"]
    lab_rooms = debug["lab_rooms"]
    lecture_sessions = debug["lecture_sessions"]
    lab_sessions = debug["lab_sessions"]
    lecture_capacity = debug["lecture_capacity"]
    lab_capacity = debug["lab_capacity"]

    if lecture_rooms == 0 and lecture_sessions > 0:
        explanations.append("No lecture rooms are available for required lecture sessions.")
    if lab_rooms == 0 and lab_sessions > 0:
        explanations.append("No lab rooms are available for required lab sessions.")

    if lecture_sessions > lecture_capacity:
        explanations.append(
            f"Lecture sessions required ({lecture_sessions}) exceed lecture room capacity ({lecture_capacity})."
        )
    if lab_sessions > lab_capacity:
        explanations.append(
            f"Lab sessions required ({lab_sessions}) exceed lab room capacity ({lab_capacity})."
        )

    sections = sorted(set([session["section"] for session in sessions]))
    for section in sections:
        section_sessions = sum(session_duration(s) for s in sessions if s["section"] == section)
        if section_sessions > total_slots:
            explanations.append(
                f"Section {section} requires {section_sessions} slot-units but only {total_slots} slots exist."
            )

    for session in sessions:
        duration = session_duration(session)
        if duration > len(slots):
            explanations.append(
                f"Session {session['id']} requires duration {duration} but only {len(slots)} consecutive slots exist in a day."
            )

        if len(allowed_room_indices(session, rooms)) == 0:
            explanations.append(
                f"Session {session['id']} requires a {session_type(session)} room, but none are available."
            )

        fixed_day = session.get("fixed_day")
        if fixed_day and fixed_day not in days:
            explanations.append(
                f"Session {session['id']} is fixed to {fixed_day}, which is not in the selected draft days."
            )

        fixed_slot = session.get("fixed_slot")
        if fixed_slot:
            fixed_sig = slot_signature(fixed_slot)
            start_index = next((i for i, slot in enumerate(slots) if slot_signature(slot) == fixed_sig), None)
            if start_index is None:
                explanations.append(f"Session {session['id']} is fixed to an unknown slot.")
            elif start_index + duration > len(slots):
                explanations.append(
                    f"Session {session['id']} does not fit after its fixed slot because duration is {duration}."
                )

    for teacher, info in teachers.items():
        teacher_sessions = [s for s in sessions if s["teacher"] == teacher]
        teacher_load = sum(session_duration(s) for s in teacher_sessions)

        avail = info.get("availability", {"type": "always"})
        if avail.get("type") == "always":
            available_slots = total_slots
        elif avail.get("type") == "days":
            available_slots = len(avail.get("days", [])) * len(slots)
        elif avail.get("type") == "time_slots":
            num_days = len(avail.get("days", days))
            available_slots = num_days * len(avail.get("time_slots", []))
        else:
            available_slots = total_slots
            explanations.append(f"Teacher {teacher} has invalid availability format.")

        if teacher_load > available_slots:
            explanations.append(
                f"Teacher {teacher} must teach {teacher_load} slot-units but is only available for {available_slots} slots."
            )

    return list(dict.fromkeys(explanations)), debug


def session_covers_slot(session, start_slot_index, occupied_slot_index):
    duration = session_duration(session)
    return start_slot_index <= occupied_slot_index < start_slot_index + duration


def start_is_valid(session, day_name, start_slot_index, days, slots, teacher_availability):
    duration = session_duration(session)
    if start_slot_index + duration > len(slots):
        return False

    fixed_day = session.get("fixed_day")
    if fixed_day and fixed_day != day_name:
        return False

    fixed_slot = session.get("fixed_slot")
    if fixed_slot and slot_signature(slots[start_slot_index]) != slot_signature(fixed_slot):
        return False

    avail = teacher_availability
    if avail.get("type") == "always":
        return True

    allowed_days = set(avail.get("days", days))
    if day_name not in allowed_days:
        return False

    if avail.get("type") == "days":
        return True

    if avail.get("type") == "time_slots":
        allowed_slots = {slot_signature(slot) for slot in avail.get("time_slots", [])}
        for offset in range(duration):
            if slot_signature(slots[start_slot_index + offset]) not in allowed_slots:
                return False
        return True

    return False


def main():
    try:
        data = json.loads(sys.stdin.read())

        days = data["time"]["days"]
        slots = data["time"]["slots"]
        sessions = data["sessions"]
        teachers = data["teachers"]
        rooms = data["rooms"]

        explanations, debug_info = explain_impossible(data)
        if explanations:
            print(json.dumps({
                "status": "NOT_POSSIBLE",
                "reasons": explanations,
                "debug": debug_info,
            }))
            return

        model = cp_model.CpModel()

        day_idx = range(len(days))
        slot_idx = range(len(slots))
        sess_idx = range(len(sessions))
        room_idx = range(len(rooms))

        z = {}
        session_assignments = {s: [] for s in sess_idx}

        for s in sess_idx:
            teacher = sessions[s]["teacher"]
            availability = teachers[teacher]["availability"]
            allowed_rooms = allowed_room_indices(sessions[s], rooms)

            for d in day_idx:
                for t in slot_idx:
                    if not start_is_valid(sessions[s], days[d], t, days, slots, availability):
                        continue
                    for r in allowed_rooms:
                        key = (s, d, t, r)
                        z[key] = model.NewBoolVar(f"z_s{s}_d{d}_t{t}_r{r}")
                        session_assignments[s].append(key)

        for s in sess_idx:
            assignments = session_assignments[s]
            if not assignments:
                print(json.dumps({
                    "status": "NOT_POSSIBLE",
                    "reasons": [f"Session {sessions[s]['id']} has no feasible time and room combination."],
                    "debug": debug_info,
                }))
                return
            model.Add(sum(z[key] for key in assignments) == 1)

        section_names = sorted(set([session["section"] for session in sessions]))

        for d in day_idx:
            for occupied_slot in slot_idx:
                for teacher_name in teachers.keys():
                    relevant = [
                        z[(s, d, t, r)]
                        for (s, d2, t, r) in z.keys()
                        if d2 == d and sessions[s]["teacher"] == teacher_name and session_covers_slot(sessions[s], t, occupied_slot)
                    ]
                    if relevant:
                        model.Add(sum(relevant) <= 1)

                for section_name in section_names:
                    relevant = [
                        z[(s, d, t, r)]
                        for (s, d2, t, r) in z.keys()
                        if d2 == d and sessions[s]["section"] == section_name and session_covers_slot(sessions[s], t, occupied_slot)
                    ]
                    if relevant:
                        model.Add(sum(relevant) <= 1)

                for r in room_idx:
                    relevant = [
                        z[(s, d, t, r2)]
                        for (s, d2, t, r2) in z.keys()
                        if d2 == d and r2 == r and session_covers_slot(sessions[s], t, occupied_slot)
                    ]
                    if relevant:
                        model.Add(sum(relevant) <= 1)

        # Schedule quality objective:
        # 1. Discourage placing the same subject multiple times on the same day for a section.
        # 2. Prefer spreading each subject across more distinct days when feasible.
        repeat_penalties = []
        day_used_vars = []
        same_type_penalties = []

        section_subject_pairs = sorted(
            {
                (sessions[s]["section"], sessions[s]["subject"])
                for s in sess_idx
            }
        )

        for section_name, subject_name in section_subject_pairs:
            relevant_sessions = [
                s for s in sess_idx
                if sessions[s]["section"] == section_name and sessions[s]["subject"] == subject_name
            ]
            if not relevant_sessions:
                continue

            max_daily_sessions = len(relevant_sessions)
            lecture_sessions = [s for s in relevant_sessions if session_type(sessions[s]) == "lecture"]
            lab_sessions = [s for s in relevant_sessions if session_type(sessions[s]) == "lab"]
            lecture_day_used = {}
            lab_day_used = {}

            for d in day_idx:
                day_assignments = [
                    z[(s, d2, t, r)]
                    for (s, d2, t, r) in z.keys()
                    if d2 == d and s in relevant_sessions
                ]
                if not day_assignments:
                    continue

                day_load = sum(day_assignments)
                day_used = model.NewBoolVar(
                    f"day_used_{section_name}_{subject_name}_{d}"
                )
                repeat_penalty = model.NewIntVar(
                    0,
                    max(0, max_daily_sessions - 1),
                    f"repeat_penalty_{section_name}_{subject_name}_{d}"
                )

                model.Add(day_load >= day_used)
                model.Add(day_load <= max_daily_sessions * day_used)
                model.Add(repeat_penalty >= day_load - 1)

                day_used_vars.append(day_used)
                repeat_penalties.append(repeat_penalty)

                lecture_assignments = [
                    z[(s, d2, t, r)]
                    for (s, d2, t, r) in z.keys()
                    if d2 == d and s in lecture_sessions
                ]
                if lecture_assignments:
                    lec_day = model.NewBoolVar(
                        f"lec_day_{section_name}_{subject_name}_{d}"
                    )
                    lecture_day_load = sum(lecture_assignments)
                    model.Add(lecture_day_load >= 1).OnlyEnforceIf(lec_day)
                    model.Add(lecture_day_load == 0).OnlyEnforceIf(lec_day.Not())
                    lecture_day_used[d] = lec_day

                lab_assignments = [
                    z[(s, d2, t, r)]
                    for (s, d2, t, r) in z.keys()
                    if d2 == d and s in lab_sessions
                ]
                if lab_assignments:
                    lab_day = model.NewBoolVar(
                        f"lab_day_{section_name}_{subject_name}_{d}"
                    )
                    lab_day_load = sum(lab_assignments)
                    model.Add(lab_day_load >= 1).OnlyEnforceIf(lab_day)
                    model.Add(lab_day_load == 0).OnlyEnforceIf(lab_day.Not())
                    lab_day_used[d] = lab_day

            for d in range(len(days) - 1):
                if d in lecture_day_used and (d + 1) in lecture_day_used:
                    same_lecture = model.NewBoolVar(
                        f"same_lecture_{section_name}_{subject_name}_{d}"
                    )
                    model.AddBoolAnd([lecture_day_used[d], lecture_day_used[d + 1]]).OnlyEnforceIf(same_lecture)
                    model.AddBoolOr([
                        lecture_day_used[d].Not(),
                        lecture_day_used[d + 1].Not(),
                        same_lecture
                    ])
                    same_type_penalties.append(same_lecture)

                if d in lab_day_used and (d + 1) in lab_day_used:
                    same_lab = model.NewBoolVar(
                        f"same_lab_{section_name}_{subject_name}_{d}"
                    )
                    model.AddBoolAnd([lab_day_used[d], lab_day_used[d + 1]]).OnlyEnforceIf(same_lab)
                    model.AddBoolOr([
                        lab_day_used[d].Not(),
                        lab_day_used[d + 1].Not(),
                        same_lab
                    ])
                    same_type_penalties.append(same_lab)

        if repeat_penalties or day_used_vars:
            total_repeat_penalty = sum(repeat_penalties) if repeat_penalties else 0
            total_used_days = sum(day_used_vars) if day_used_vars else 0
            total_same_type_penalty = sum(same_type_penalties) if same_type_penalties else 0
            model.Minimize(
                (1000 * total_repeat_penalty)
                + (500 * total_same_type_penalty)
                - total_used_days
            )

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5

        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print(json.dumps({
                "status": "NOT_POSSIBLE",
                "reasons": ["No feasible timetable satisfies hard constraints."],
                "debug": build_debug_info(data),
            }))
            return

        timetable = []

        for s in sess_idx:
            duration = session_duration(sessions[s])
            for key in session_assignments[s]:
                (_, d, t, r) = key
                if solver.Value(z[key]) == 1:
                    end_index = min(t + duration - 1, len(slots) - 1)
                    room_id = rooms[r]["id"]
                    timetable.append({
                        "session_id": sessions[s]["id"],
                        "section": sessions[s]["section"],
                        "section_id": sessions[s].get("section_id"),
                        "sectionId": sessions[s].get("section_id"),
                        "subject": sessions[s]["subject"],
                        "subject_id": sessions[s].get("subject_id"),
                        "type": session_type(sessions[s]),
                        "teacher": sessions[s]["teacher"],
                        "teacher_id": sessions[s].get("teacher_id"),
                        "day": days[d],
                        "slot": {
                            "start": slots[t]["start"],
                            "end": slots[end_index]["end"],
                        },
                        "start_slot": slots[t],
                        "duration": duration,
                        "room": room_id,
                        "roomId": room_id,
                    })
                    break

        print(json.dumps({
            "status": "POSSIBLE",
            "timetable": timetable,
        }))

    except Exception as e:
        print(json.dumps({
            "status": "ERROR",
            "message": str(e),
        }))


if __name__ == "__main__":
    main()
