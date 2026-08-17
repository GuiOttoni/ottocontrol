import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { truncate } from "./text-utils.js";

const COPILOT_HOME = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
const SESSION_STATE_DIR = path.join(COPILOT_HOME, "session-state");

// workspace.yaml is a flat `key: value` file (no nesting/arrays observed in
// practice) — cheap to hand-parse without pulling in a YAML dependency.
function parseSimpleYaml(text) {
  const obj = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(": ");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 2).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    obj[key] = value;
  }
  return obj;
}

async function readEventsSummary(file) {
  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let messageCount = 0;
  const models = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "user.message" || event.type === "assistant.message") {
      messageCount++;
      if (event.data?.model) models.add(event.data.model);
    }
  }

  return { messageCount, models: [...models] };
}

export async function listSessions() {
  if (!fs.existsSync(SESSION_STATE_DIR)) return [];

  const dirs = fs.readdirSync(SESSION_STATE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  const sessions = [];

  for (const dir of dirs) {
    const sessionDir = path.join(SESSION_STATE_DIR, dir.name);
    const yamlFile = path.join(sessionDir, "workspace.yaml");
    if (!fs.existsSync(yamlFile)) continue;

    let meta;
    try {
      meta = parseSimpleYaml(fs.readFileSync(yamlFile, "utf8"));
    } catch {
      continue;
    }

    const eventsFile = path.join(sessionDir, "events.jsonl");
    const hasDetail = fs.existsSync(eventsFile);
    let messageCount = 0;
    let models = [];
    if (hasDetail) {
      try {
        const summary = await readEventsSummary(eventsFile);
        messageCount = summary.messageCount;
        models = summary.models;
      } catch {
        // leave defaults
      }
    }

    sessions.push({
      id: dir.name,
      provider: "copilot",
      project: meta.repository || (meta.cwd ? path.basename(meta.cwd) || meta.cwd : "desconhecido"),
      projectPath: meta.cwd ?? null,
      firstTs: meta.created_at ?? null,
      lastTs: meta.updated_at ?? meta.created_at ?? null,
      messageCount,
      models,
      usage: null,
      hasDetail,
      detailParams: { dir: dir.name },
    });
  }

  return sessions;
}

export async function getDetail(dir) {
  const eventsFile = path.join(SESSION_STATE_DIR, dir, "events.jsonl");
  if (!fs.existsSync(eventsFile)) {
    return { sessionId: dir, project: dir, turns: [], detailUnavailable: true };
  }

  const stream = fs.createReadStream(eventsFile, { encoding: "utf8" });
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

    if (event.type === "user.message") {
      turns.push({
        role: "user",
        timestamp: event.timestamp ?? null,
        parts: [{ kind: "text", text: event.data?.content ?? "" }],
      });
    } else if (event.type === "assistant.message") {
      const parts = [];
      if (event.data?.content) parts.push({ kind: "text", text: event.data.content });
      for (const tool of event.data?.toolRequests ?? []) {
        parts.push({
          kind: "tool_use",
          text: `${tool.name}(${truncate(JSON.stringify(tool.arguments ?? {}), 1000)})`,
        });
      }
      if (parts.length > 0) {
        turns.push({ role: "assistant", timestamp: event.timestamp ?? null, parts });
      }
    }
  }

  return { sessionId: dir, project: dir, turns };
}
