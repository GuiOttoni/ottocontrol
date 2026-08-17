import { listClaudeSessions, getSessionDetail as getClaudeDetail } from "./sessions.js";
import { listSessions as listCopilotSessions, getDetail as getCopilotDetail } from "./copilot-sessions.js";
import { listSessions as listGeminiSessions, getDetail as getGeminiDetail } from "./gemini-sessions.js";

function adaptClaude(sessions) {
  return sessions.map((s) => ({
    id: s.id,
    provider: "claude",
    project: s.project,
    projectPath: s.cwd ?? null,
    firstTs: s.firstTs,
    lastTs: s.lastTs,
    messageCount: s.messageCount,
    models: s.models,
    usage: s.usage,
    hasDetail: true,
    detailParams: { dir: s.project, file: s.id },
  }));
}

export async function listAllSessions() {
  const [claude, copilot, gemini] = await Promise.all([
    listClaudeSessions().then(adaptClaude),
    listCopilotSessions(),
    listGeminiSessions(),
  ]);

  const sessions = [...claude, ...copilot, ...gemini];
  sessions.sort((a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0));
  return sessions;
}

export async function getSessionDetailFor(provider, params) {
  if (provider === "claude") return getClaudeDetail(params.dir, params.file);
  if (provider === "copilot") return getCopilotDetail(params.dir);
  if (provider === "gemini") return getGeminiDetail(params.dir, params.file);
  return null;
}

// Tools ottocontrol is aware of but can't yet parse locally, since their
// session/chat history lives in proprietary SQLite databases (VS Code
// storage service) or protobuf blobs rather than plain JSON/JSONL — shown
// in the UI so the gap is explicit instead of silently missing.
export const UNSUPPORTED_SESSION_SOURCES = [
  {
    id: "cursor",
    name: "Cursor",
    reason: "Histórico de chat fica em bancos SQLite internos do editor (workspaceStorage/state.vscdb), sem formato documentado.",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    reason: "Histórico do Cascade fica em armazenamento interno do editor, sem formato documentado.",
  },
  {
    id: "antigravity-ide",
    name: "Antigravity (IDE)",
    reason: "Sessões do IDE ficam em blobs binários/protobuf internos (pasta 'brain'), distintos da Antigravity CLI.",
  },
];
