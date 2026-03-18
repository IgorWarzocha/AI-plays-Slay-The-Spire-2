#!/usr/bin/env node

import { buildReferenceLibrary } from "/home/igorw/Work/STS2/reference/src/pipeline/buildReferenceLibrary.ts";
import { RUNTIME_REFERENCE_PATH, RUNTIME_SOURCE_SUMMARY_PATH } from "/home/igorw/Work/STS2/reference/src/config.ts";
import { writeJson } from "/home/igorw/Work/STS2/reference/src/io/fs.ts";
import { LocalSaveAugmentSource } from "/home/igorw/Work/STS2/reference/src/sources/localSaveAugmentSource.ts";
import { SpireCodexBootstrapSource } from "/home/igorw/Work/STS2/reference/src/sources/spireCodexBootstrapSource.ts";
import { printJson } from "./lib/json-output.ts";

async function main() {
  const { library, sourceSummary } = await buildReferenceLibrary({
    bootstrapSource: new SpireCodexBootstrapSource(),
    augmentSource: new LocalSaveAugmentSource(),
  });

  writeJson(RUNTIME_REFERENCE_PATH, library);
  writeJson(RUNTIME_SOURCE_SUMMARY_PATH, sourceSummary);

  printJson({
    ok: true,
    libraryPath: RUNTIME_REFERENCE_PATH,
    sourceSummaryPath: RUNTIME_SOURCE_SUMMARY_PATH,
    counts: library.metadata.counts,
  });
}

await main();
