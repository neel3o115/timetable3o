import { runSolver as runSolverFn } from "../utils/runSolver.js";

class SolverService {
  async runSolver(draft) {
    return runSolverFn(draft);
  }
}

export default new SolverService();
