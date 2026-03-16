import { SCHEMA_VERSION } from "../config.mjs";
import { normalizeText } from "../model/ids.mjs";
import { normalizeCard, normalizeEvent, normalizeRelic } from "../model/normalize.mjs";

function buildState(kind, canonicalId, rawName, augmentation) {
  const discoveredSet = augmentation.discovered[`${kind}s`];
  const runCounters = augmentation.currentRun[`${kind}s`] ?? {};
  const runCount = runCounters[canonicalId] ?? 0;
  const currentEventMatches = kind === "event" && (
    augmentation.currentRun.currentEventId === canonicalId
    || augmentation.currentRun.currentEventTitle === normalizeText(rawName)
  );

  return {
    discovered: discoveredSet.has(canonicalId),
    inCurrentRun: runCount > 0 || currentEventMatches,
    runCount: kind === "event" ? null : runCount || null,
    isCurrentEvent: kind === "event" ? currentEventMatches : null,
  };
}

export async function buildReferenceLibrary({ bootstrapSource, augmentSource }) {
  const [bootstrap, augmentation] = await Promise.all([
    bootstrapSource.load(),
    augmentSource.load(),
  ]);

  const cards = bootstrap.cards.map((raw) =>
    normalizeCard(raw, bootstrapSource.id, buildState("card", raw.id, raw.name, augmentation)));
  const relics = bootstrap.relics.map((raw) =>
    normalizeRelic(raw, bootstrapSource.id, buildState("relic", raw.id, raw.name, augmentation)));
  const events = bootstrap.events.map((raw) =>
    normalizeEvent(raw, bootstrapSource.id, buildState("event", raw.id, raw.name, augmentation)));

  return {
    library: {
      metadata: {
        schemaVersion: SCHEMA_VERSION,
        builtAtUtc: new Date().toISOString(),
        counts: {
          cards: cards.length,
          relics: relics.length,
          events: events.length,
        },
        sources: [
          {
            id: bootstrapSource.id,
            kind: bootstrapSource.kind,
            status: "loaded",
            detail: "Loaded English cards/relics/events bootstrap data.",
          },
          {
            id: augmentSource.id,
            kind: augmentSource.kind,
            status: "loaded",
            detail: "Augmented discovered ids and current run metadata from local saves.",
          },
        ],
      },
      cards,
      relics,
      events,
    },
    sourceSummary: {
      builtAtUtc: new Date().toISOString(),
      bootstrapSource: {
        id: bootstrapSource.id,
        kind: bootstrapSource.kind,
      },
      augmentSource: {
        id: augmentSource.id,
        kind: augmentSource.kind,
        paths: augmentation.paths,
        currentEventTitle: augmentation.currentRun.currentEventTitle,
      },
    },
  };
}
