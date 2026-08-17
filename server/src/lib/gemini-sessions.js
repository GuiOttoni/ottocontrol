import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { truncate } from "./text-utils.js";

const GEMINI_HOME = path.join(os.homedir(), ".gemini");
const TMP_DIR = path.join(GEMINI_HOME, "tmp");
const PROJECTS_FILE = path.join(GEMINI_HOME, "projects.json");

// `content` is usually a plain string, but user messages can carry the
// native Gemini `Part[]` shape instead (e.g. `[{ text: "..." }]`).
function extractContentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// projects.json maps absolute project path -> short slug. We only need the
// slug -> path direction, and only for display, so build it lazily.
function loadProjectPaths() {
  if (!fs.existsSync(PROJECTS_FILE)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
    const bySlug = {};
    for (const [projectPath, slug] of Object.entries(data.projects ?? {})) {
      bySlug[slug] = projectPath;
    }
    return bySlug;
  } catch {
    return {};
  }
}

const HASH_LIKE = /^[0-9a-f]{32,64}$/i;

export async function listSessions() {
  if (!fs.existsSync(TMP_DIR)) return [];
  const projectPaths = loadProjectPaths();

  // Gemini CLI can keep the same project's chats under both a hash-named
  // tmp dir and a friendlier slug dir, so the same session file gets read
  // twice with two different sessionIds->same id. Process slug dirs first
  // so the first (kept) copy of each duplicate has the nicer label.
  const projectDirs = fs
    .readdirSync(TMP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => Number(HASH_LIKE.test(a.name)) - Number(HASH_LIKE.test(b.name)));

  const seenIds = new Set();
  const sessions = [];

  for (const dir of projectDirs) {
    const chatsDir = path.join(TMP_DIR, dir.name, "chats");
    if (!fs.existsSync(chatsDir)) continue;

    const files = fs.readdirSync(chatsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(chatsDir, file), "utf8"));
        const id = data.sessionId ?? file;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const messages = data.messages ?? [];
        sessions.push({
          id,
          provider: "gemini",
          project: dir.name,
          projectPath: projectPaths[dir.name] ?? null,
          firstTs: data.startTime ?? null,
          lastTs: data.lastUpdated ?? data.startTime ?? null,
          messageCount: messages.length,
          models: [],
          usage: null,
          hasDetail: true,
          detailParams: { dir: dir.name, file },
        });
      } catch {
        // skip unreadable/corrupt session file
      }
    }
  }

  return sessions;
}

export async function getDetail(dir, file) {
  const target = path.join(TMP_DIR, dir, "chats", file);
  if (!fs.existsSync(target)) return null;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    // corrupt/unreadable session file — degrade to "not found" rather than
    // throwing (matches how a missing file is already handled above).
    return null;
  }
  const turns = (data.messages ?? []).map((m) => {
    const parts = [{ kind: "text", text: extractContentText(m.content) }];
    for (const thought of m.thoughts ?? []) {
      parts.push({
        kind: "thinking",
        text: truncate(`${thought.subject ? thought.subject + ": " : ""}${thought.description ?? ""}`, 4000),
      });
    }
    return {
      role: m.type === "user" ? "user" : "assistant",
      timestamp: m.timestamp ?? null,
      parts,
    };
  });

  return { sessionId: data.sessionId ?? file, project: dir, turns };
}
