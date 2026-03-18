import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSubagentModel,
  getLatestRunLogPath,
  parseFrontmatter,
  selectLatestMarkdownFile,
} from "../lib/sts-fight-manager.ts";

test("parseFrontmatter returns body and key-value frontmatter", () => {
  const parsed = parseFrontmatter(`---\nprovider: anthropic\nmodel: claude-sonnet-4-5\nreasoning: medium\n---\n\n# Prompt\nDo the thing.`);

  assert.deepEqual(parsed.frontmatter, {
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    reasoning: "medium",
  });
  assert.equal(parsed.body, "# Prompt\nDo the thing.");
});

test("buildSubagentModel joins provider, model, and reasoning once", () => {
  assert.equal(
    buildSubagentModel({ provider: "anthropic", model: "claude-sonnet-4-5", reasoning: "high" }),
    "anthropic/claude-sonnet-4-5:high",
  );
  assert.equal(
    buildSubagentModel({ provider: "anthropic", model: "anthropic/claude-sonnet-4-5", reasoning: "" }),
    "anthropic/claude-sonnet-4-5",
  );
  assert.equal(
    buildSubagentModel({ provider: "anthropic", model: "anthropic/claude-sonnet-4-5:medium", reasoning: "high" }),
    "anthropic/claude-sonnet-4-5:medium",
  );
});

test("selectLatestMarkdownFile prefers newest mtime and stable tie-breaker", () => {
  assert.equal(selectLatestMarkdownFile([]), null);
  assert.equal(
    selectLatestMarkdownFile([
      { path: "/tmp/a.md", mtimeMs: 1 },
      { path: "/tmp/b.md", mtimeMs: 2 },
    ]),
    "/tmp/b.md",
  );
  assert.equal(
    selectLatestMarkdownFile([
      { path: "/tmp/a.md", mtimeMs: 2 },
      { path: "/tmp/b.md", mtimeMs: 2 },
    ]),
    "/tmp/b.md",
  );
});

test("getLatestRunLogPath picks the latest markdown file from a directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sts-run-log-"));
  const older = path.join(dir, "older.md");
  const newer = path.join(dir, "newer.md");
  const ignored = path.join(dir, "ignored.txt");

  fs.writeFileSync(older, "old\n", "utf8");
  fs.writeFileSync(newer, "new\n", "utf8");
  fs.writeFileSync(ignored, "ignore\n", "utf8");

  const now = Date.now() / 1000;
  fs.utimesSync(older, now - 100, now - 100);
  fs.utimesSync(newer, now, now);

  assert.equal(getLatestRunLogPath(dir), newer);

  fs.rmSync(dir, { recursive: true, force: true });
});
