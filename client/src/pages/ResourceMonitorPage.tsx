import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Cpu, MemoryStick, Box } from "lucide-react";
import { apiResources } from "../lib/apiResources";
import type { ResourcesResponse } from "../lib/apiResources";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

const CATEGORY_COLOR: Record<string, string> = {
  ottocontrol: "bg-accent",
  claude: "bg-purple-400",
  copilot: "bg-sky-400",
  gemini: "bg-amber-400",
  dotnet: "bg-fuchsia-400",
  java: "bg-orange-400",
  python: "bg-emerald-400",
  docker: "bg-cyan-400",
  "node-other": "bg-lime-400",
  other: "bg-text-tertiary",
};

export default function ResourceMonitorPage() {
  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiResources.get());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const usedMem = data ? data.system.totalMemBytes - data.system.freeMemBytes : 0;
  const usedMemPct = data ? Math.round((usedMem / data.system.totalMemBytes) * 100) : 0;
  const maxCategoryMem = data ? Math.max(...data.categories.map((c) => c.memoryBytes), 1) : 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">Sistema</div>
      <div className="flex items-center gap-3">
        <h2 className="m-0 text-xl font-bold text-text-primary">Monitor de Recursos</h2>
        <button
          onClick={load}
          title="Atualizar agora"
          className="cursor-pointer text-text-tertiary transition-colors hover:text-accent"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-atualizar (10s)
        </label>
      </div>
      <p className="mt-2 mb-5 text-sm text-text-secondary">
        Consumo de memória e CPU do ottocontrol, sessões de agentes IA (Claude, Copilot, Gemini),
        outros processos Node/npm, .NET, Java, Python e Docker rodando na máquina.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">Erro: {error}</p>}
      {!data && loading && <p className="text-sm text-text-secondary">Coletando dados de processos...</p>}

      {data && (
        <>
          {/* System overview */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <MemoryStick size={14} /> Memória do sistema
              </div>
              <div className="mt-1 text-lg font-bold text-text-primary">
                {formatBytes(usedMem)} <span className="text-xs font-normal text-text-tertiary">/ {formatBytes(data.system.totalMemBytes)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                <div className="h-full bg-accent" style={{ width: `${usedMemPct}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-text-tertiary">{usedMemPct}% em uso</div>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Cpu size={14} /> CPU
              </div>
              <div className="mt-1 text-lg font-bold text-text-primary">{data.system.cpuCount} núcleos</div>
              <div className="mt-1 truncate text-[10px] text-text-tertiary" title={data.system.cpuModel ?? ""}>
                {data.system.cpuModel}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Box size={14} /> ottocontrol (este processo)
              </div>
              <div className="mt-1 text-lg font-bold text-text-primary">{formatBytes(data.self.rssBytes)}</div>
              <div className="mt-1 text-[10px] text-text-tertiary">PID {data.self.pid} · heap {formatBytes(data.self.heapUsedBytes)}</div>
            </div>
          </div>

          {/* Category breakdown */}
          <h3 className="mb-3 text-sm font-bold text-text-primary">Por categoria</h3>
          <div className="mb-6 flex flex-col gap-2">
            {data.categories.map((c) => (
              <div key={c.category} className="flex items-center gap-3 rounded-md border border-border bg-bg-card px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLOR[c.category] ?? "bg-text-tertiary"}`} />
                <span className="w-44 shrink-0 text-sm text-text-primary">{c.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className={`h-full ${CATEGORY_COLOR[c.category] ?? "bg-text-tertiary"}`}
                    style={{ width: `${Math.max((c.memoryBytes / maxCategoryMem) * 100, 2)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-text-secondary">{formatBytes(c.memoryBytes)}</span>
                <span className="w-16 shrink-0 text-right text-xs text-text-secondary">{c.cpuPercent}% cpu</span>
                <span className="w-20 shrink-0 text-right text-xs text-text-tertiary">{c.count} proc.</span>
              </div>
            ))}
            {data.categories.length === 0 && (
              <p className="text-sm text-text-secondary">Nenhum processo relevante encontrado.</p>
            )}
          </div>

          {/* Docker containers */}
          <h3 className="mb-3 text-sm font-bold text-text-primary">Containers Docker</h3>
          {!data.docker.available && (
            <p className="mb-6 text-sm text-text-secondary">Docker não está rodando ou o CLI não está disponível.</p>
          )}
          {data.docker.available && data.docker.containers.length === 0 && (
            <p className="mb-6 text-sm text-text-secondary">Docker rodando, sem containers ativos.</p>
          )}
          {data.docker.available && data.docker.containers.length > 0 && (
            <table className="mb-6 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Container</th>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">CPU</th>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Memória</th>
                </tr>
              </thead>
              <tbody>
                {data.docker.containers.map((c) => (
                  <tr key={c.id}>
                    <td className="border-b border-border px-3 py-2 text-text-primary">{c.name}</td>
                    <td className="border-b border-border px-3 py-2 text-text-primary">{c.cpuPercent.toFixed(1)}%</td>
                    <td className="border-b border-border px-3 py-2 text-text-primary">
                      {c.memUsage} <span className="text-text-tertiary">({c.memPercent.toFixed(1)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Process detail */}
          <h3 className="mb-3 text-sm font-bold text-text-primary">Processos</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">PID</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Nome</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Categoria</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">CPU</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Memória</th>
              </tr>
            </thead>
            <tbody>
              {data.processes.map((p) => (
                <tr key={p.pid} title={p.commandLine ?? undefined} className="hover:bg-bg-card-hover">
                  <td className="border-b border-border px-3 py-2 text-text-tertiary">{p.pid}</td>
                  <td className="border-b border-border px-3 py-2 text-text-primary">{p.name}</td>
                  <td className="border-b border-border px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className={`h-2 w-2 rounded-full ${CATEGORY_COLOR[p.category] ?? "bg-text-tertiary"}`} />
                      {p.category}
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-2 text-text-primary">{p.cpuPercent}%</td>
                  <td className="border-b border-border px-3 py-2 text-text-primary">{formatBytes(p.memoryBytes)}</td>
                </tr>
              ))}
              {data.processes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-text-secondary">
                    Nenhum processo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
