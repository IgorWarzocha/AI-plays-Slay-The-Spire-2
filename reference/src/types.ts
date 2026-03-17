export type EntityKind = 'card' | 'relic' | 'event';

export interface ReferenceEntityState {
  discovered: boolean;
  inCurrentRun: boolean;
  runCount: number | null;
  isCurrentEvent: boolean | null;
}

export interface BaseEntity {
  kind: EntityKind;
  id: string;
  gameId: string;
  name: string;
  description: string | null;
  descriptionRaw: string | null;
  imageUrl: string | null;
  source: string;
  aliases: string[];
  state: ReferenceEntityState;
}

export interface CardEntity extends BaseEntity {
  kind: 'card';
  cost: string | number | null;
  type: string | null;
  rarity: string | null;
  color: string | null;
  target: string | null;
  keywords: string[];
  tags: string[];
  upgrade: unknown;
}

export interface RelicEntity extends BaseEntity {
  kind: 'relic';
  rarity: string | null;
  pool: string | null;
  flavor: string | null;
}

export interface EventEntity extends BaseEntity {
  kind: 'event';
  type: string | null;
  act: string | null;
  epithet: string | null;
  options: unknown;
  pages: unknown;
  relics: string[];
}

export interface ReferenceLibrary {
  metadata: {
    schemaVersion: string;
    builtAtUtc: string;
    counts: {
      cards: number;
      relics: number;
      events: number;
    };
    sources: Array<{
      id: string;
      kind: string;
      status: string;
      detail: string;
    }>;
  };
  cards: CardEntity[];
  relics: RelicEntity[];
  events: EventEntity[];
}

export interface SourceSummary {
  builtAtUtc: string;
  bootstrapSource: {
    id: string;
    kind: string;
  };
  augmentSource: {
    id: string;
    kind: string;
    paths: {
      progressPath: string | null;
      currentRunPath: string | null;
    };
    currentEventTitle: string | null;
  };
}

export interface BootstrapPayload {
  cards: BootstrapRawEntity[];
  relics: BootstrapRawEntity[];
  events: BootstrapRawEntity[];
}

export interface BootstrapRawEntity {
  id: string;
  name?: string;
  description?: string | null;
  description_raw?: string | null;
  image_url?: string | null;
  cost?: string | number | null;
  type?: string | null;
  rarity?: string | null;
  color?: string | null;
  target?: string | null;
  keywords?: string[];
  tags?: string[];
  upgrade?: unknown;
  pool?: string | null;
  flavor?: string | null;
  act?: string | null;
  epithet?: string | null;
  options?: unknown;
  pages?: unknown;
  relics?: string[];
  [key: string]: unknown;
}

export interface ReferenceAugmentation {
  discovered: {
    cards: Set<string>;
    relics: Set<string>;
    events: Set<string>;
  };
  currentRun: {
    cards: Record<string, number>;
    relics: Record<string, number>;
    currentEventId: string | null;
    currentEventTitle: string | null;
  };
  paths: {
    progressPath: string | null;
    currentRunPath: string | null;
  };
}

export interface SearchOptions {
  kind?: EntityKind | 'all';
  limit?: number | string;
  exact?: boolean;
}

export interface SearchResult<T extends CardEntity | RelicEntity | EventEntity = CardEntity | RelicEntity | EventEntity> {
  entity: T;
  score: number;
}
