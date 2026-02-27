import User from "../models/User.js";
import { BaseRepository } from "./BaseRepository.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email) {
    return this.findOne({ email: email?.trim().toLowerCase() });
  }
}

export default new UserRepository();
