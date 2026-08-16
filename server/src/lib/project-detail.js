import fs from "node:fs";
import path from "node:path";
import { spawn, exec } from "node:child_process";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".venv",
  "venv",
  "__pycache__",
  "target",
  "bin",
  "obj",
]);

const MAX_ENTRIES_PER_DIR = 200;

// Shallow-ish recursive tree, capped in depth and breadth so a huge repo
// (or an accidentally-included node_modules) can't blow up the response.
export function buildTree(dir, depth = 3) {
  function walk(current, level) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return [];
    }

    entries = entries
      .filter((e) => !SKIP_DIRS.has(e.name))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_ENTRIES_PER_DIR);

    return entries.map((e) => {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        return {
          name: e.name,
          type: "dir",
          children: level < depth ? walk(full, level + 1) : null,
        };
      }
      return { name: e.name, type: "file" };
    });
  }

  return walk(dir, 1);
}

const README_PATTERN = /^readme(\.(md|markdown|txt))?$/i;

export function findReadme(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const file = entries.find((e) => e.isFile() && README_PATTERN.test(e.name));
  if (!file) return null;

  try {
    return { file: file.name, content: fs.readFileSync(path.join(dir, file.name), "utf8") };
  } catch {
    return null;
  }
}

export function openInVSCode(dir) {
  return new Promise((resolve) => {
    exec(`code "${dir}"`, (err) => {
      if (err) resolve({ ok: false, error: "Comando 'code' não encontrado no PATH." });
      else resolve({ ok: true });
    });
  });
}

export function openTerminal(dir) {
  return new Promise((resolve) => {
    try {
      const child = spawn("cmd.exe", ["/c", "start", '""', "cmd.exe", "/k", `cd /d "${dir}"`], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.unref();
      resolve({ ok: true });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}
