import Session from "../models/Session.js";
import { BaseRepository } from "./BaseRepository.js";

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }
}

export default new SessionRepository();
