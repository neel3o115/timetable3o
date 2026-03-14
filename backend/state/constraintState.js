export const constraintState = {
  // ---- BASE REQUIRED ----
  days: null,          // ["Mon", "Tue", ...]
  time_slots: null,    // ["9-10", "10-11", ...]
  sections: null,      // ["A", "B", "C"]

  /*
    subjects example:
    {
      Maths: {
        lectures_per_week: 2,
        labs_per_week: 2
      }
    }
  */
  subjects: null,

  /*
    teachers example (availability is REQUIRED):
    {
      T1: {
        teaches: ["Maths"],

        availability: {
          type: "full" 
          OR
          type: "custom",
          days: ["Mon", "Tue"],
          time_slots: ["9-10", "10-11"]
        }
      }
    }
  */
  teachers: null,

  /*
    rooms example:
    {
      lecture: 2,
      lab: 2
    }
  */
  rooms: null,

  // ---- SOFT CONSTRAINTS ----
  soft_constraints: [],

  // ---- FLOW CONTROL ----
  asked_soft_constraints: false
};