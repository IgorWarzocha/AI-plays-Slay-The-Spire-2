export class ReferenceSource {
  constructor(id, kind) {
    this.id = id;
    this.kind = kind;
  }

  async load() {
    throw new Error(`Source '${this.id}' must implement load().`);
  }
}
