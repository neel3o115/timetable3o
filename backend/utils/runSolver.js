import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

import { buildTimetableGrid } from "../solver/buildGrid.js";
import { buildSolverInput } from "../solver/buildSolverInput.js";
import { formatSlot } from "./formatSlot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function collectSections(solverInput) {
  const sections = [...new Set((solverInput.sessions || []).map((session) => session.section).filter(Boolean))];
  return sections.length > 0 ? sections : ["Main"];
}

export async function runSolver(draft) {
  if (!draft) {
    throw new Error("Draft is required");
  }

  const solverInput = buildSolverInput(draft);
  const pythonPath = path.join(__dirname, "../python/solver.py");

  const result = await new Promise((resolve, reject) => {
    const python = spawn("python3", [pythonPath]);
    let output = "";
    let errorOutput = "";

    python.stdin.setEncoding("utf-8");

    const timeout = setTimeout(() => {
      python.kill();
      reject(new Error("Python solver timed out"));
    }, Number(process.env.SOLVER_TIMEOUT_MS || 15000));

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0 || errorOutput) {
        return reject(new Error(errorOutput || "Python solver failed"));
      }

      try {
        const solverResult = JSON.parse(output);

        if (solverResult.status === "POSSIBLE") {
          const sections = collectSections(solverInput);
          const grid = buildTimetableGrid(
            solverResult.timetable,
            solverInput.time.days,
            solverInput.time.slots,
            sections
          );

          return resolve({
            status: "POSSIBLE",
            timetable: solverResult.timetable,
            grid,
            time: {
              days: solverInput.time.days,
              slots: solverInput.time.slots.map(formatSlot)
            }
          });
        }

        if (solverResult.status === "NOT_POSSIBLE") {
          return resolve({
            status: "NOT_POSSIBLE",
            reasons: solverResult.reasons || [],
            debug: solverResult.debug || null
          });
        }

        return reject(new Error(solverResult.message || "Unknown solver response"));
      } catch {
        return reject(new Error("Invalid JSON from Python solver"));
      }
    });

    python.stdin.write(JSON.stringify(solverInput));
    python.stdin.end();
  });

  return result;
}
