import fs from "node:fs";
import path from "node:path";
import { TOOLS, CANONICAL_FILE, SYNC_HEADER, mdcFrontmatter } from "./tools.js";

function stripSyncHeader(content) {
  return content.startsWith(SYNC_HEADER) ? content.slice(SYNC_HEADER.length) : content;
}

function stripMdc(content) {
  const parts = content.split("---\n");
  // ["", frontmatter, body...] when frontmatter present
  if (content.startsWith("---\n") && parts.length >= 3) {
    return parts.slice(2).join("---\n").trim() + "\n";
  }
  return content;
}

// A file is "foreign" if it exists but wasn't written by a previous sync —
// i.e. it doesn't start with our marker. Foreign files must never be
// silently overwritten (that's how a real CLAUDE.md with project docs
// gets destroyed by a sync click).
function isForeign(tool, existingContent) {
  const marker = tool.kind === "mdc" ? mdcFrontmatter() : SYNC_HEADER;
  return !existingContent.startsWith(marker);
}

export function readCanonical(projectRoot) {
  const file = path.join(projectRoot, CANONICAL_FILE);
  if (!fs.existsSync(file)) return { exists: false, content: "" };
  return { exists: true, content: fs.readFileSync(file, "utf8") };
}

export function writeCanonical(projectRoot, content, overwriteForeign = []) {
  const file = path.join(projectRoot, CANONICAL_FILE);
  fs.writeFileSync(file, content, "utf8");
  return syncFromCanonical(projectRoot, content, overwriteForeign);
}

// overwriteForeign: tool ids the caller has explicitly confirmed may
// overwrite pre-existing, non-synced content. Anything else with foreign
// content is left untouched and reported back as skipped.
export function syncFromCanonical(projectRoot, content, overwriteForeign = []) {
  const results = [];
  for (const tool of TOOLS) {
    const target = path.join(projectRoot, tool.projectFile);
    const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;

    if (existing !== null && isForeign(tool, existing) && !overwriteForeign.includes(tool.id)) {
      results.push({ tool: tool.id, file: tool.projectFile, written: false, reason: "foreign-content" });
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    const body = tool.kind === "mdc" ? mdcFrontmatter() + content : SYNC_HEADER + content;
    fs.writeFileSync(target, body, "utf8");
    results.push({ tool: tool.id, file: tool.projectFile, written: true });
  }
  return results;
}

// Reads the current on-disk content of every mirrored file (with headers
// stripped) so the UI can flag drift against AGENTS.md before overwriting.
export function readMirrors(projectRoot) {
  return TOOLS.map((tool) => {
    const target = path.join(projectRoot, tool.projectFile);
    if (!fs.existsSync(target)) {
      return { tool: tool.id, name: tool.name, file: tool.projectFile, exists: false, foreign: false };
    }
    const raw = fs.readFileSync(target, "utf8");
    const foreign = isForeign(tool, raw);
    const body = foreign ? raw : tool.kind === "mdc" ? stripMdc(raw) : stripSyncHeader(raw);
    return { tool: tool.id, name: tool.name, file: tool.projectFile, exists: true, foreign, body };
  });
}

// status: "missing" | "foreign" (pre-existing content we must not clobber
// silently) | "in-sync" | "drift" (ours, but stale relative to AGENTS.md)
export function driftReport(projectRoot) {
  const { content: canonical } = readCanonical(projectRoot);
  const canonicalTrimmed = canonical.trim();
  return readMirrors(projectRoot).map((m) => {
    let status = "missing";
    if (m.exists) {
      status = m.foreign ? "foreign" : m.body.trim() === canonicalTrimmed ? "in-sync" : "drift";
    }
    return { ...m, status, inSync: status === "in-sync" };
  });
}
