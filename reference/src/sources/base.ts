export abstract class ReferenceSource<TLoad> {
  public readonly id: string;
  public readonly kind: string;

  protected constructor(id: string, kind: string) {
    this.id = id;
    this.kind = kind;
  }

  abstract load(): Promise<TLoad>;
}
