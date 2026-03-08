import { validateDraft as validateDraftFn } from "../utils/validateDraft.js";

class DraftValidator {
  validate(draft, options = {}) {
    return validateDraftFn(draft, options);
  }

  validateForSave(draft) {
    return this.validate(draft, { requireComplete: false });
  }

  validateForSolve(draft) {
    return this.validate(draft, { requireComplete: true });
  }
}

export default new DraftValidator();
