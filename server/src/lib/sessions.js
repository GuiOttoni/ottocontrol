import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

// Parses one Claude Code session transcript (JSONL). Each line is an
// independent JSON event; assistant messages carry a `usage` block with
// token counts. We sum those rather than compute $ cost, since price
// depends on plan/model and shifts over time.
async function parseSession(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let firstTs = null;
  let lastTs = null;
  let messageCount = 0;
  const models = new Set();
  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.timestamp) {
      if (!firstTs) firstTs = event.timestamp;
      lastTs = event.timestamp;
    }
    if (event.type === "assistant" || event.type === "user") messageCount++;

    const u = event.message?.usage;
    if (u) {
      if (event.message.model) models.add(event.message.model);
      for (const key of Object.keys(usage)) {
        if (typeof u[key] === "number") usage[key] += u[key];
      }
    }
  }

  return {
    id: path.basename(filePath, ".jsonl"),
    file: filePath,
    firstTs,
    lastTs,
    messageCount,
    models: [...models],
    usage,
  };
}

export async function listClaudeSessions() {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return [];

  const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

  const sessions = [];
  for (const dir of projectDirs) {
    const full = path.join(CLAUDE_PROJECTS_DIR, dir.name);
    const files = fs.readdirSync(full).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      try {
        const parsed = await parseSession(path.join(full, f));
        sessions.push({ project: dir.name, ...parsed });
      } catch {
        // skip unreadable/corrupt transcript
      }
    }
  }

  sessions.sort((a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0));
  return sessions;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "\n… (truncado)" : str;
}

// Flattens one message's `content` (a string, or an array of
// text/thinking/tool_use/tool_result blocks) into displayable parts.
function extractParts(content) {
  if (typeof content === "string") {
    return content ? [{ kind: "text", text: content }] : [];
  }
  if (!Array.isArray(content)) return [];

  const parts = [];
  for (const block of content) {
    if (block.type === "text" && block.text) {
      parts.push({ kind: "text", text: block.text });
    } else if (block.type === "thinking" && block.thinking) {
      parts.push({ kind: "thinking", text: truncate(block.thinking, 4000) });
    } else if (block.type === "tool_use") {
      const input = truncate(JSON.stringify(block.input ?? {}), 1000);
      parts.push({ kind: "tool_use", text: `${block.name}(${input})` });
    } else if (block.type === "tool_result") {
      let text;
      if (typeof block.content === "string") text = block.content;
      else if (Array.isArray(block.content)) text = block.content.map((b) => b.text ?? "").join("\n");
      else text = JSON.stringify(block.content ?? "");
      parts.push({ kind: "tool_result", text: truncate(text, 4000) });
    }
  }
  return parts;
}

export async function getSessionDetail(project, sessionId) {
  const file = path.join(CLAUDE_PROJECTS_DIR, project, `${sessionId}.jsonl`);
  if (!fs.existsSync(file)) return null;

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const turns = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.isMeta) continue;
    if (event.type !== "user" && event.type !== "assistant") continue;

    const parts = extractParts(event.message?.content);
    if (parts.length === 0) continue;

    turns.push({ role: event.type, timestamp: event.timestamp ?? null, parts });
  }

  return { sessionId, project, turns };
}

export function summarizeUsageByDay(sessions) {
  const byDay = {};
  for (const s of sessions) {
    if (!s.lastTs) continue;
    const day = s.lastTs.slice(0, 10);
    byDay[day] ??= { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, sessions: 0 };
    byDay[day].sessions++;
    for (const key of Object.keys(s.usage)) byDay[day][key] += s.usage[key];
  }
  return byDay;
}
