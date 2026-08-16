export type AgentFolders = {
  claude: string;
  cursor: string;
  gemini: string;
  windsurf: string;
  aider: string;
  copilot: string;
};

export type OttoConfig = {
  projectsFolder: string;
  homeFolder: string;
  agentFolders: AgentFolders;
  custom: Record<string, unknown>;
};

export type SettingsResponse = {
  config: OttoConfig;
  file: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const apiSettings = {
  get: () => fetch("/api/settings").then((r) => json<SettingsResponse>(r)),

  save: (config: OttoConfig) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }).then((r) => json<{ ok: boolean; config: OttoConfig }>(r)),
};
