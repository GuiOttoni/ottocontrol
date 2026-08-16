import { useEffect, useState } from "react";
import { Info, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import type { AgentGlobalConfig, MirrorStatus, Project, SupportedAgent } from "../lib/api";
import Modal from "../components/Modal";

export default function InstructionsPage() {
  const [view, setView] = useState<"project" | "global">("project");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-8 pt-5">
        <button
          onClick={() => setView("project")}
          className={`cursor-pointer rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-all ${
            view === "project"
              ? "border-border bg-bg-card text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Por projeto
        </button>
        <button
          onClick={() => setView("global")}
          className={`cursor-pointer rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-all ${
            view === "global"
              ? "border-border bg-bg-card text-accent"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Globais (pasta do usuário)
        </button>
        <SupportedAgentsTooltip />
      </div>
      <div className="min-h-0 flex-1">
        {view === "project" ? <ProjectInstructions /> : <GlobalInstructions />}
      </div>
    </div>
  );
}

function ProjectInstructions() {
  const [root, setRoot] = useState("F:/projetos");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [content, setContent] = useState("");
  const [mirrors, setMirrors] = useState<MirrorStatus[]>([]);
  const [confirmedForeign, setConfirmedForeign] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  async function scan() {
    const res = await api.scan(root);
    setProjects(res.projects);
  }

  useEffect(() => {
    scan();
  }, []);

  async function openProject(p: Project) {
    setSelected(p);
    setStatus(null);
    setConfirmedForeign(new Set());
    const res = await api.instructions(p.path);
    setContent(res.canonical.content);
    setMirrors(res.mirrors);
  }

  async function save() {
    if (!selected) return;
    setStatus("Salvando e sincronizando...");
    const result = await api.saveInstructions(selected.path, content, [...confirmedForeign]);
    const res = await api.instructions(selected.path);
    setMirrors(res.mirrors);

    const skipped = result.synced.filter((s) => !s.written);
    setStatus(
      skipped.length === 0
        ? "Sincronizado com sucesso."
        : `Sincronizado. ${skipped.length} arquivo(s) com conteúdo próprio NÃO foram sobrescritos — marque abaixo para autorizar.`
    );
  }

  function toggleForeign(toolId: string) {
    setConfirmedForeign((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  }

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border">
        <div className="flex gap-2 p-4">
          <input
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button
            onClick={scan}
            className="cursor-pointer rounded-md border border-border-bright bg-transparent px-3 py-2 text-sm font-medium text-text-primary transition-all hover:-translate-y-px hover:border-accent hover:text-accent hover:shadow-[0_0_12px_var(--accent-glow)]"
          >
            Escanear
          </button>
        </div>
        <ul className="m-0 list-none p-0">
          {projects.map((p) => (
            <li
              key={p.path}
              onClick={() => openProject(p)}
              className={`flex cursor-pointer flex-col gap-1 border-b border-border px-4 py-3 ${
                selected?.path === p.path
                  ? "border-l-2 border-l-accent bg-bg-card"
                  : "hover:bg-bg-card-hover"
              }`}
            >
              <strong className="text-sm font-semibold text-text-primary">{p.name}</strong>
              <span className="text-xs text-text-secondary">
                {p.hasCanonical ? "AGENTS.md" : "sem AGENTS.md"} · {p.tools.length} ferramenta(s)
              </span>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="cursor-default px-4 py-3 text-sm text-text-secondary">
              Nenhum projeto com instruções encontrado.
            </li>
          )}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!selected && <p className="text-sm text-text-secondary">Selecione um projeto à esquerda.</p>}
        {selected && (
          <>
            <h2 className="m-0 text-xl font-bold text-text-primary">{selected.name}</h2>
            <p className="-mt-2 mb-4 text-xs text-text-tertiary">{selected.path}</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo canônico (AGENTS.md)..."
              rows={16}
              className="w-full resize-y rounded-md border border-border bg-bg-secondary p-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
            />
            <div className="my-4 flex items-center gap-4">
              <button
                onClick={save}
                className="cursor-pointer rounded-md border border-accent-dim bg-accent-glow px-4 py-2 text-sm font-medium text-accent transition-all hover:-translate-y-px hover:shadow-[0_0_12px_var(--accent-glow)]"
              >
                Salvar e sincronizar em todas as ferramentas
              </button>
              {status && <span className="text-sm text-accent">{status}</span>}
            </div>

            <h3 className="mb-1 text-base font-bold text-text-primary">Status por ferramenta</h3>
            <p className="mb-3 text-sm text-text-secondary">
              Arquivos marcados como <strong className="text-text-primary">conteúdo próprio</strong>{" "}
              já tinham texto que não veio de um sync anterior — não são sobrescritos a menos que
              você marque a caixa e salve de novo.
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                    Ferramenta
                  </th>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                    Arquivo
                  </th>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                    Estado
                  </th>
                  <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                    Sobrescrever
                  </th>
                </tr>
              </thead>
              <tbody>
                {mirrors.map((m) => (
                  <tr key={m.tool}>
                    <td className="border-b border-border px-3 py-2 text-text-primary">{m.name}</td>
                    <td className="border-b border-border px-3 py-2">
                      <code>{m.file}</code>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      {m.status === "missing" && (
                        <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                          ausente
                        </span>
                      )}
                      {m.status === "in-sync" && (
                        <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          sincronizado
                        </span>
                      )}
                      {m.status === "drift" && (
                        <span className="rounded-full bg-gold-glow px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                          divergente
                        </span>
                      )}
                      {m.status === "foreign" && (
                        <span className="rounded-full bg-accent-glow px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                          conteúdo próprio
                        </span>
                      )}
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      {m.status === "foreign" && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-red-400">
                          <input
                            type="checkbox"
                            checked={confirmedForeign.has(m.tool)}
                            onChange={() => toggleForeign(m.tool)}
                          />
                          autorizar
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function SupportedAgentsTooltip() {
  const [agents, setAgents] = useState<SupportedAgent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.supportedAgents().then((res) => setAgents(res.agents));
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Agentes CLI suportados"
        className="inline-flex cursor-pointer items-center text-text-tertiary transition-colors hover:text-accent"
      >
        <Info size={15} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Agentes CLI suportados pelo ottocontrol"
        widthClass="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          {agents.map((a) => (
            <div key={a.id}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{a.name}</span>
                <a
                  href={a.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-tertiary hover:text-accent"
                  title="Documentação"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{a.description}</p>
            </div>
          ))}
          {agents.length === 0 && <p className="text-sm text-text-secondary">Carregando...</p>}
        </div>
      </Modal>
    </>
  );
}

function GlobalInstructions() {
  const [agents, setAgents] = useState<AgentGlobalConfig[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  function draftKey(tool: string, fileId: string) {
    return `${tool}:${fileId}`;
  }

  async function load() {
    const res = await api.globalConfig();
    setAgents(res.agents);
    setActiveTool((prev) => prev ?? res.agents[0]?.tool ?? null);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const agent of res.agents) {
        for (const file of agent.files) {
          const key = draftKey(agent.tool, file.id);
          if (!(key in next)) next[key] = file.content;
        }
      }
      return next;
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function save(tool: string, fileId: string) {
    const key = draftKey(tool, fileId);
    setStatus((s) => ({ ...s, [key]: "Salvando..." }));
    await api.saveGlobalConfigFile(tool, fileId, drafts[key] ?? "");
    await load();
    setStatus((s) => ({ ...s, [key]: "Salvo com sucesso." }));
  }

  const active = agents.find((a) => a.tool === activeTool);

  return (
    <div className="flex h-full">
      <div className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border">
        {agents.map((a) => (
          <button
            key={a.tool}
            onClick={() => setActiveTool(a.tool)}
            className={`cursor-pointer border-b border-border px-4 py-3 text-left text-sm font-medium transition-colors ${
              activeTool === a.tool
                ? "border-l-2 border-l-accent bg-bg-card text-accent"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            }`}
          >
            {a.name}
            <span className="ml-1.5 text-xs text-text-tertiary">({a.files.length})</span>
          </button>
        ))}
        {agents.length === 0 && (
          <p className="p-4 text-sm text-text-secondary">Carregando agentes...</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!active && <p className="text-sm text-text-secondary">Selecione um agente à esquerda.</p>}
        {active && (
          <>
            <div className="mb-1 flex items-center gap-3">
              <h2 className="m-0 text-xl font-bold text-text-primary">{active.name}</h2>
              <a
                href={active.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Documentação <ExternalLink size={12} />
              </a>
            </div>
            <p className="mb-6 max-w-2xl text-sm text-text-secondary">{active.description}</p>

            <div className="flex flex-col gap-5">
              {active.files.map((file) => {
                const key = draftKey(active.tool, file.id);
                return (
                  <div key={file.id} className="rounded-md border border-border bg-bg-card p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-text-primary">{file.label}</h3>
                      {file.exists ? (
                        <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          existente
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                          ausente
                        </span>
                      )}
                    </div>
                    <p className="mb-1 text-xs text-text-secondary">{file.description}</p>
                    <p className="mb-2 truncate text-xs text-text-tertiary" title={file.path}>
                      {file.path}
                    </p>
                    <textarea
                      value={drafts[key] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      rows={8}
                      placeholder="Sem conteúdo ainda..."
                      className="w-full resize-y rounded-md border border-border bg-bg-secondary p-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
                    />
                    <div className="mt-3 flex items-center gap-4">
                      <button
                        onClick={() => save(active.tool, file.id)}
                        className="cursor-pointer rounded-md border border-accent-dim bg-accent-glow px-4 py-2 text-sm font-medium text-accent transition-all hover:-translate-y-px hover:shadow-[0_0_12px_var(--accent-glow)]"
                      >
                        Salvar
                      </button>
                      {status[key] && <span className="text-sm text-accent">{status[key]}</span>}
                    </div>
                  </div>
                );
              })}
              {active.files.length === 0 && (
                <p className="text-sm text-text-secondary">
                  Nenhum arquivo de configuração global documentado para esta ferramenta.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
