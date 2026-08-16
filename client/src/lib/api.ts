export type Tool = {
  id: string;
  name: string;
  projectFile: string;
  globalFile?: string;
  kind: string;
};

export type Project = {
  name: string;
  path: string;
  hasCanonical: boolean;
  tools: string[];
};

export type MirrorStatus = {
  tool: string;
  name: string;
  file: string;
  exists: boolean;
  foreign: boolean;
  body?: string;
  inSync: boolean;
  status: "missing" | "foreign" | "in-sync" | "drift";
};

export type SyncResult = {
  tool: string;
  file: string;
  written: boolean;
  reason?: string;
};

export type InstructionsResponse = {
  tools: string[];
  canonical: { exists: boolean; content: string };
  mirrors: MirrorStatus[];
};

export type GlobalConfigFile = {
  id: string;
  label: string;
  path: string;
  description: string;
  exists: boolean;
  content: string;
};

export type AgentGlobalConfig = {
  tool: string;
  name: string;
  description: string;
  docsUrl: string;
  files: GlobalConfigFile[];
};

export type SupportedAgent = {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  hasGlobalConfig: boolean;
};

export type ClaudeSession = {
  id: string;
  project: string;
  firstTs: string | null;
  lastTs: string | null;
  messageCount: number;
  models: string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
};

export type SessionPart = {
  kind: "text" | "thinking" | "tool_use" | "tool_result";
  text: string;
};

export type SessionTurn = {
  role: "user" | "assistant";
  timestamp: string | null;
  parts: SessionPart[];
};

export type SessionDetail = {
  sessionId: string;
  project: string;
  turns: SessionTurn[];
  detailUnavailable?: boolean;
};

export type SessionProvider = "claude" | "copilot" | "gemini";

export type UnifiedSession = {
  id: string;
  provider: SessionProvider;
  project: string;
  projectPath: string | null;
  firstTs: string | null;
  lastTs: string | null;
  messageCount: number;
  models: string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  } | null;
  hasDetail: boolean;
  detailParams: { dir: string; file?: string };
};

export type UnsupportedSessionSource = {
  id: string;
  name: string;
  reason: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  tools: () => fetch("/api/tools").then((r) => json<{ tools: Tool[] }>(r)),

  scan: (root: string) =>
    fetch(`/api/projects/scan?root=${encodeURIComponent(root)}`).then((r) =>
      json<{ root: string; projects: Project[] }>(r)
    ),

  instructions: (projectRoot: string) =>
    fetch(`/api/instructions?projectRoot=${encodeURIComponent(projectRoot)}`).then((r) =>
      json<InstructionsResponse>(r)
    ),

  saveInstructions: (projectRoot: string, content: string, overwriteForeign: string[] = []) =>
    fetch("/api/instructions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectRoot, content, overwriteForeign }),
    }).then((r) => json<{ ok: boolean; synced: SyncResult[] }>(r)),

  globalConfig: () =>
    fetch("/api/instructions/global").then((r) => json<{ agents: AgentGlobalConfig[] }>(r)),

  saveGlobalConfigFile: (tool: string, fileId: string, content: string) =>
    fetch("/api/instructions/global", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, fileId, content }),
    }).then((r) => json<{ ok: boolean; tool: string; file: string; path: string }>(r)),

  supportedAgents: () =>
    fetch("/api/instructions/supported-agents").then((r) => json<{ agents: SupportedAgent[] }>(r)),

  claudeSessions: () =>
    fetch("/api/sessions/claude").then((r) =>
      json<{ sessions: ClaudeSession[]; byDay: Record<string, any> }>(r)
    ),

  sessionDetail: (project: string, sessionId: string) =>
    fetch(`/api/sessions/claude/${encodeURIComponent(project)}/${encodeURIComponent(sessionId)}`).then(
      (r) => json<SessionDetail>(r)
    ),

  allSessions: () =>
    fetch("/api/sessions/all").then((r) =>
      json<{ sessions: UnifiedSession[]; unsupported: UnsupportedSessionSource[] }>(r)
    ),

  sessionDetailFor: (provider: SessionProvider, detailParams: { dir: string; file?: string }) => {
    const params = new URLSearchParams({ provider, dir: detailParams.dir });
    if (detailParams.file) params.set("file", detailParams.file);
    return fetch(`/api/sessions/detail?${params}`).then((r) => json<SessionDetail>(r));
  },
};
