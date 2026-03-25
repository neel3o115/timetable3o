import { buildSolverInput } from "../solver/buildSolverInput.js";

const draft = {
  name: "Sample Draft",
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  slots: [
    { id: "slot-1", start: "09:00", end: "10:00" },
    { id: "slot-2", start: "10:00", end: "11:00" },
    { id: "slot-3", start: "11:00", end: "12:00" }
  ],
  sections: [
    { id: "sec-a", name: "Section A" },
    { id: "sec-b", name: "Section B" }
  ],
  teachers: [
    { id: "t-gaurav", name: "Gaurav Sir" },
    { id: "t-krushn", name: "Krushn Sir" }
  ],
  subjects: [
    {
      id: "sub-math",
      name: "Math",
      sessions: {
        lec: { frequency: 2 },
        lab: { frequency: 1 }
      },
      teachers: {
        "sec-a": { lec: "t-gaurav", lab: "t-gaurav" },
        "sec-b": { lec: "t-gaurav", lab: "t-gaurav" }
      }
    },
    {
      id: "sub-science",
      name: "Science",
      sessions: {
        lec: { frequency: 2 },
        lab: { frequency: 0 }
      },
      teachers: {
        "sec-a": { lec: "t-krushn" },
        "sec-b": { lec: "t-krushn" }
      }
    }
  ],
  rooms: [
    { id: "101", type: "lecture" },
    { id: "102", type: "lecture" },
    { id: "504", type: "lab" }
  ],
  constraints: {
    noConsecutiveClasses: false,
    avoidGaps: false,
    labAfterLecture: false
  }
};

const solverInput = buildSolverInput(draft);
console.log(JSON.stringify(solverInput, null, 2));
