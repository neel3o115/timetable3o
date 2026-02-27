import Draft from "../models/Draft.js";
import { BaseRepository } from "./BaseRepository.js";

class DraftRepository extends BaseRepository {
  constructor() {
    super(Draft);
  }

  findByUser(userId) {
    return this.find({ user_id: userId }, { sort: { updatedAt: -1 }, lean: true });
  }
}

export default new DraftRepository();
