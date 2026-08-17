import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { MirrorStatus } from "../lib/api";

type InstructionsEditorProps = {
  projectPath: string;
  projectName?: string;
  onLoaded?: (exists: boolean) => void;
};

export default function InstructionsEditor({ projectPath, projectName, onLoaded }: InstructionsEditorProps) {
  const [content, setContent] = useState("");
  const [mirrors, setMirrors] = useState<MirrorStatus[]>([]);
  const [confirmedForeign, setConfirmedForeign] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setStatus(null);
    setConfirmedForeign(new Set());
    const res = await api.instructions(projectPath);
    setContent(res.canonical.content);
    setMirrors(res.mirrors);
    setLoading(false);
    onLoaded?.(res.canonical.exists);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  async function save() {
    setStatus("Salvando e sincronizando...");
    const result = await api.saveInstructions(projectPath, content, [...confirmedForeign]);
    const res = await api.instructions(projectPath);
    setMirrors(res.mirrors);
    onLoaded?.(res.canonical.exists);

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

  if (loading) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }

  return (
    <>
      {projectName && <h2 className="m-0 text-xl font-bold text-text-primary">{projectName}</h2>}
      <p className="-mt-2 mb-4 text-xs text-text-tertiary">{projectPath}</p>
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
  );
}
