import fs from "node:fs";
import path from "node:path";
import { TOOLS, CANONICAL_FILE } from "./tools.js";

const ALL_FILES = [CANONICAL_FILE, ...TOOLS.map((t) => t.projectFile)];

function hasAnyInstructionFile(dir) {
  return ALL_FILES.some((f) => fs.existsSync(path.join(dir, f)));
}

function describeProject(name, dir) {
  const tools = TOOLS.filter((t) => fs.existsSync(path.join(dir, t.projectFile))).map((t) => t.id);
  return {
    name,
    path: dir,
    hasCanonical: fs.existsSync(path.join(dir, CANONICAL_FILE)),
    tools,
  };
}

// Same recursion shape as lib/projects.js: a directory that already has
// instruction files is recorded and NOT descended into further (so a
// project's own subfolders don't surface as separate entries); anything
// else gets recursed into, up to `maxDepth`, so nested groups like
// `Ativos/` still get their projects found.
function scanDir(dir, depth, maxDepth, projects) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const sub = path.join(dir, entry.name);
    if (hasAnyInstructionFile(sub)) {
      projects.push(describeProject(entry.name, sub));
    } else {
      scanDir(sub, depth + 1, maxDepth, projects);
    }
  }
}

// Recursively scans `root` for projects with known instruction files, up
// to `maxDepth` levels deep (default 5).
export function scanWorkspace(root, maxDepth = 5) {
  if (!fs.existsSync(root)) return [];
  const projects = [];
  scanDir(root, 1, maxDepth, projects);
  return projects;
}
