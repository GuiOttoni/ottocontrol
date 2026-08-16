import { useEffect, useState } from "react";
import { apiSettings } from "../lib/apiSettings";
import type { OttoConfig } from "../lib/apiSettings";

const AGENT_LABELS: Record<keyof OttoConfig["agentFolders"], string> = {
  claude: "Claude Code",
  cursor: "Cursor",
  gemini: "Antigravity / Gemini CLI",
  windsurf: "Windsurf",
  aider: "Aider",
  copilot: "GitHub Copilot",
};

export default function SettingsPage() {
  const [config, setConfig] = useState<OttoConfig | null>(null);
  const [file, setFile] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await apiSettings.get();
    setConfig(res.config);
    setFile(res.file);
    setLoading(false);
  }

  async function save() {
    if (!config) return;
    setStatus("Salvando...");
    try {
      const res = await apiSettings.save(config);
      setConfig(res.config);
      setStatus("Salvo com sucesso.");
    } catch (err) {
      setStatus(`Erro ao salvar: ${(err as Error).message}`);
    }
  }

  function setField<K extends keyof OttoConfig>(key: K, value: OttoConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setAgentFolder(agent: keyof OttoConfig["agentFolders"], value: string) {
    setConfig((prev) =>
      prev ? { ...prev, agentFolders: { ...prev.agentFolders, [agent]: value } } : prev
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">Seção</div>
      <h2 className="m-0 text-xl font-bold text-text-primary">Configurações</h2>

      {loading && <p className="mt-4 text-sm text-text-secondary">Carregando...</p>}

      {!loading && config && (
        <div className="mt-4 max-w-2xl">
          <div className="rounded-md border border-border bg-bg-card p-5">
            <h3 className="m-0 mb-3 text-base font-bold text-text-primary">Pastas gerais</h3>

            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Pasta de projetos
            </label>
            <input
              value={config.projectsFolder}
              onChange={(e) => setField("projectsFolder", e.target.value)}
              className="mb-4 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />

            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Pasta do usuário
            </label>
            <input
              value={config.homeFolder}
              onChange={(e) => setField("homeFolder", e.target.value)}
              className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="mt-4 rounded-md border border-border bg-bg-card p-5">
            <h3 className="m-0 mb-3 text-base font-bold text-text-primary">Pastas por agente</h3>
            <div className="flex flex-col gap-4">
              {(Object.keys(AGENT_LABELS) as (keyof OttoConfig["agentFolders"])[]).map((agent) => (
                <div key={agent}>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    {AGENT_LABELS[agent]}
                  </label>
                  <input
                    value={config.agentFolders[agent]}
                    onChange={(e) => setAgentFolder(agent, e.target.value)}
                    placeholder="(vazio)"
                    className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="my-4 flex items-center gap-4">
            <button
              onClick={save}
              className="cursor-pointer rounded-md border border-accent-dim bg-accent-glow px-4 py-2 text-sm font-medium text-accent transition-all hover:-translate-y-px hover:shadow-[0_0_12px_var(--accent-glow)]"
            >
              Salvar
            </button>
            {status && <span className="text-sm text-accent">{status}</span>}
          </div>

          <p className="text-xs text-text-tertiary">Arquivo de configuração: {file}</p>
        </div>
      )}
    </div>
  );
}
