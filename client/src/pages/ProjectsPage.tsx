import { useEffect, useState } from "react";
import { LayoutGrid, List, Folder, File, ExternalLink, Code2, TerminalSquare, FileText } from "lucide-react";
import { apiProjects } from "../lib/apiProjects";
import type { DetectedProject, ProjectType, TreeNode, Readme } from "../lib/apiProjects";
import Modal from "../components/Modal";
import InstructionsEditor from "../components/InstructionsEditor";

const TYPE_BADGE: Record<ProjectType, string> = {
  frontend: "bg-sky-900/30 text-sky-400",
  backend: "bg-emerald-900/40 text-emerald-400",
  fullstack: "bg-accent-glow text-accent",
  infra: "bg-gold-glow text-gold",
  unknown: "bg-bg-secondary text-text-tertiary",
};

const TYPE_LABEL: Record<ProjectType, string> = {
  frontend: "frontend",
  backend: "backend",
  fullstack: "fullstack",
  infra: "infra",
  unknown: "desconhecido",
};

type ViewMode = "cards" | "list";
const VIEW_STORAGE_KEY = "ottocontrol.projects.view";

export default function ProjectsPage() {
  const [root, setRoot] = useState("");
  const [effectiveRoot, setEffectiveRoot] = useState("");
  const [projects, setProjects] = useState<DetectedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DetectedProject | null>(null);
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "cards"
  );

  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  async function load(r?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiProjects.list(r || undefined);
      setEffectiveRoot(res.root);
      setRoot(res.root);
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">
        Seção
      </div>
      <h2 className="m-0 text-xl font-bold text-text-primary">Projetos</h2>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <input
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder={effectiveRoot || "F:/projetos"}
            className="w-96 rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button
            onClick={() => load(root)}
            className="cursor-pointer rounded-md border border-border-bright bg-transparent px-3 py-2 text-sm font-medium text-text-primary transition-all hover:-translate-y-px hover:border-accent hover:text-accent hover:shadow-[0_0_12px_var(--accent-glow)]"
          >
            Escanear
          </button>
        </div>

        <div className="flex shrink-0 gap-1 rounded-md border border-border p-1">
          <button
            onClick={() => changeView("cards")}
            title="Ver em cards"
            className={`cursor-pointer rounded p-1.5 transition-colors ${
              view === "cards" ? "bg-bg-card-hover text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => changeView("list")}
            title="Ver em lista"
            className={`cursor-pointer rounded p-1.5 transition-colors ${
              view === "list" ? "bg-bg-card-hover text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {effectiveRoot && (
        <p className="mt-2 text-xs text-text-tertiary">
          Raiz atual: {effectiveRoot} · busca recursiva · {projects.length} projeto(s) encontrado(s)
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">Erro: {error}</p>}

      {loading && <p className="mt-6 text-sm text-text-secondary">Escaneando...</p>}
      {!loading && projects.length === 0 && !error && (
        <p className="mt-6 text-sm text-text-secondary">Nenhum projeto encontrado nesta pasta.</p>
      )}

      {!loading && projects.length > 0 && (
        view === "cards" ? (
          <CardsView projects={projects} onSelect={setSelected} />
        ) : (
          <ListView projects={projects} onSelect={setSelected} />
        )
      )}

      {selected && <ProjectDetailModal project={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TypeBadge({ type }: { type: ProjectType }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_BADGE[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}

function GitInfo({ p, stopPropagation }: { p: DetectedProject; stopPropagation?: boolean }) {
  if (!p.hasGit) return <span className="text-text-tertiary">sem git</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-text-secondary">
        branch: <span className="text-text-primary">{p.branch ?? "?"}</span>
      </span>
      {p.remoteUrl && (
        <a
          href={p.remoteUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => stopPropagation && e.stopPropagation()}
          className="truncate text-accent hover:underline"
          title={p.remoteUrl}
        >
          {p.remoteUrl}
        </a>
      )}
    </div>
  );
}

function CardsView({
  projects,
  onSelect,
}: {
  projects: DetectedProject[];
  onSelect: (p: DetectedProject) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((p) => (
        <div
          key={p.path}
          onClick={() => onSelect(p)}
          className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-bg-card p-4 transition-all hover:-translate-y-px hover:border-border-glow hover:shadow-[0_0_16px_var(--accent-glow)]"
        >
          <div className="flex items-start justify-between gap-2">
            <strong className="text-sm font-semibold text-text-primary">{p.name}</strong>
            <TypeBadge type={p.type} />
          </div>

          <p className="-mt-2 truncate text-xs text-text-tertiary" title={p.path}>
            {p.path}
          </p>

          {p.techHints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.techHints.map((hint) => (
                <span
                  key={hint}
                  className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-secondary"
                >
                  {hint}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto text-xs">
            <GitInfo p={p} stopPropagation />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  projects,
  onSelect,
}: {
  projects: DetectedProject[];
  onSelect: (p: DetectedProject) => void;
}) {
  return (
    <table className="mt-6 w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Nome</th>
          <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Tipo</th>
          <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Caminho</th>
          <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Tech</th>
          <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">Git</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr
            key={p.path}
            onClick={() => onSelect(p)}
            className="cursor-pointer transition-colors hover:bg-bg-card-hover"
          >
            <td className="border-b border-border px-3 py-2 font-medium text-text-primary">{p.name}</td>
            <td className="border-b border-border px-3 py-2">
              <TypeBadge type={p.type} />
            </td>
            <td className="max-w-xs truncate border-b border-border px-3 py-2 text-xs text-text-tertiary" title={p.path}>
              {p.path}
            </td>
            <td className="border-b border-border px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {p.techHints.map((hint) => (
                  <span
                    key={hint}
                    className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-secondary"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            </td>
            <td className="border-b border-border px-3 py-2 text-xs">
              <GitInfo p={p} stopPropagation />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TreeView({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <ul className="m-0 list-none p-0">
      {nodes.map((n) => (
        <li key={n.name} style={{ paddingLeft: depth * 14 }}>
          <div className="flex items-center gap-1.5 py-0.5 text-xs">
            {n.type === "dir" ? (
              <Folder size={13} className="shrink-0 text-accent" />
            ) : (
              <File size={13} className="shrink-0 text-text-tertiary" />
            )}
            <span className={n.type === "dir" ? "text-text-primary" : "text-text-secondary"}>{n.name}</span>
          </div>
          {n.children && n.children.length > 0 && <TreeView nodes={n.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function ProjectDetailModal({ project, onClose }: { project: DetectedProject; onClose: () => void }) {
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [readme, setReadme] = useState<Readme>(null);
  const [readmeLoaded, setReadmeLoaded] = useState(false);
  const [tab, setTab] = useState<"tree" | "readme" | "instructions">("tree");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [hasInstructions, setHasInstructions] = useState<boolean | null>(null);

  useEffect(() => {
    setTree(null);
    setReadme(null);
    setReadmeLoaded(false);
    setTab("tree");
    setActionStatus(null);
    setHasInstructions(null);
    apiProjects.tree(project.path).then((res) => setTree(res.tree));
    apiProjects.readme(project.path).then((res) => {
      setReadme(res.readme);
      setReadmeLoaded(true);
    });
  }, [project]);

  async function handleOpenVSCode() {
    setActionStatus("Abrindo VS Code...");
    const res = await apiProjects.openVSCode(project.path);
    setActionStatus(res.ok ? "VS Code aberto." : res.error ?? "Falha ao abrir VS Code.");
  }

  async function handleOpenTerminal() {
    setActionStatus("Abrindo terminal...");
    const res = await apiProjects.openTerminal(project.path);
    setActionStatus(res.ok ? "Terminal aberto." : res.error ?? "Falha ao abrir terminal.");
  }

  return (
    <Modal open onClose={onClose} title={project.name} subtitle={project.path} widthClass="max-w-3xl">
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <TypeBadge type={project.type} />
          {project.techHints.map((hint) => (
            <span
              key={hint}
              className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-secondary"
            >
              {hint}
            </span>
          ))}
        </div>

        <div className="text-xs">
          <GitInfo p={project} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenVSCode}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-accent-dim bg-accent-glow px-3 py-1.5 text-xs font-medium text-accent transition-all hover:-translate-y-px hover:shadow-[0_0_12px_var(--accent-glow)]"
          >
            <Code2 size={13} /> Abrir no VS Code
          </button>
          <button
            onClick={handleOpenTerminal}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border-bright bg-transparent px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:-translate-y-px hover:border-accent hover:text-accent"
          >
            <TerminalSquare size={13} /> Abrir terminal
          </button>
          <button
            onClick={() => setTab("instructions")}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border-bright bg-transparent px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:-translate-y-px hover:border-accent hover:text-accent"
          >
            <FileText size={13} /> {hasInstructions ? "Editar instruções" : "Adicionar instruções"}
          </button>
          {project.remoteUrl && (
            <a
              href={project.remoteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent"
            >
              <ExternalLink size={13} /> Remoto
            </a>
          )}
          {actionStatus && <span className="text-xs text-accent">{actionStatus}</span>}
        </div>

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("tree")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === "tree" ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            Arquivos
          </button>
          <button
            onClick={() => setTab("readme")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === "readme" ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            README
          </button>
          <button
            onClick={() => setTab("instructions")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === "instructions" ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            Instruções
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-bg-secondary p-3">
          {tab === "tree" && (
            <>
              {!tree && <p className="text-xs text-text-secondary">Carregando árvore de arquivos...</p>}
              {tree && tree.length === 0 && <p className="text-xs text-text-secondary">Pasta vazia.</p>}
              {tree && tree.length > 0 && <TreeView nodes={tree} />}
            </>
          )}
          {tab === "readme" && (
            <>
              {!readmeLoaded && <p className="text-xs text-text-secondary">Carregando README...</p>}
              {readmeLoaded && readme === null && (
                <p className="text-xs text-text-secondary">Nenhum README encontrado.</p>
              )}
              {readme && (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-primary">
                  {readme.content}
                </pre>
              )}
            </>
          )}
          {tab === "instructions" && (
            <InstructionsEditor projectPath={project.path} onLoaded={setHasInstructions} />
          )}
        </div>
      </div>
    </Modal>
  );
}
