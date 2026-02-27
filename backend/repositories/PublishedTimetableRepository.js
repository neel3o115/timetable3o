import PublishedTimetable from "../models/PublishedTimetable.js";
import { BaseRepository } from "./BaseRepository.js";

class PublishedTimetableRepository extends BaseRepository {
  constructor() {
    super(PublishedTimetable);
  }

  findByShareId(id) {
    return this.findOne({ id });
  }

  findByShareIdLean(id) {
    return this.findOneLean({ id });
  }

  findByOwner(ownerId) {
    return this.find({ owner: ownerId }, { sort: { updated_at: -1, created_at: -1 }, lean: true });
  }
}

export default new PublishedTimetableRepository();
