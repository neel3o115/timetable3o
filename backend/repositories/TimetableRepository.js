import Timetable from "../models/Timetable.js";
import { BaseRepository } from "./BaseRepository.js";

class TimetableRepository extends BaseRepository {
  constructor() {
    super(Timetable);
  }

  findByOwner(ownerId) {
    return this.find({ owner: ownerId }, { sort: { updatedAt: -1 }, lean: true });
  }

  findSharedByToken(token) {
    return this.findOne({ "share_tokens.token": token });
  }

  findSharedByTokenLean(token) {
    return this.findOneLean({ "share_tokens.token": token });
  }
}

export default new TimetableRepository();
