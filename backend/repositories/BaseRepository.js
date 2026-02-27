export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(data) {
    return this.model.create(data);
  }

  findById(id) {
    return this.model.findById(id);
  }

  findByIdLean(id) {
    return this.model.findById(id).lean();
  }

  findOne(query) {
    return this.model.findOne(query);
  }

  findOneLean(query) {
    return this.model.findOne(query).lean();
  }

  find(query = {}, options = {}) {
    let cursor = this.model.find(query);
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.lean) cursor = cursor.lean();
    return cursor;
  }

  exists(query) {
    return this.model.exists(query);
  }
}
