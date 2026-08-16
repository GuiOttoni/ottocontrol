import { useEffect, useMemo, useState } from "react";
import { Search, Info } from "lucide-react";
import { api } from "../lib/api";
import type { SessionProvider, UnifiedSession, UnsupportedSessionSource, SessionDetail } from "../lib/api";
import Modal from "../components/Modal";

const KIND_LABEL: Record<string, string> = {
  text: "",
  thinking: "raciocínio",
  tool_use: "ferramenta",
  tool_result: "resultado",
};

const PROVIDER_META: Record<SessionProvider, { label: string; badge: string }> = {
  claude: { label: "Claude Code", badge: "bg-accent-glow text-accent" },
  copilot: { label: "GitHub Copilot", badge: "bg-sky-900/30 text-sky-400" },
  gemini: { label: "Gemini / Antigravity", badge: "bg-gold-glow text-gold" },
};

type ProviderFilter = "all" | SessionProvider;

export default function SessionsPage() {
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [unsupported, setUnsupported] = useState<UnsupportedSessionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UnifiedSession | null>(null);
  const [showUnsupported, setShowUnsupported] = useState(false);

  useEffect(() => {
    api.allSessions().then((res) => {
      setSessions(res.sessions);
      setUnsupported(res.unsupported);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    const c: Record<ProviderFilter, number> = { all: sessions.length, claude: 0, copilot: 0, gemini: 0 };
    for (const s of sessions) c[s.provider]++;
    return c;
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (providerFilter !== "all" && s.provider !== providerFilter) return false;
      if (q && !s.project.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessions, providerFilter, search]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-text-secondary">
        Histórico
      </div>
      <div className="flex items-center gap-2">
        <h2 className="m-0 text-xl font-bold text-text-primary">Sessões de IA</h2>
        <button
          onClick={() => setShowUnsupported(true)}
          title="Fontes ainda não suportadas"
          className="inline-flex cursor-pointer items-center text-text-tertiary transition-colors hover:text-accent"
        >
          <Info size={14} />
        </button>
      </div>
      <p className="mt-2 mb-4 text-sm text-text-secondary">
        Agregado de <code>~/.claude/projects</code>, <code>~/.copilot/session-state</code> e{" "}
        <code>~/.gemini/tmp/*/chats</code>. Clique em uma sessão para ver e pesquisar o histórico
        completo.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-border p-1">
          {(["all", "claude", "copilot", "gemini"] as ProviderFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                providerFilter === p
                  ? "bg-bg-card-hover text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {p === "all" ? "Todas" : PROVIDER_META[p].label} ({counts[p]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary px-3 py-1.5">
          <Search size={13} className="text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por projeto..."
            className="w-48 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>

        <span className="text-xs text-text-tertiary">
          {filtered.length} de {sessions.length} sessões
        </span>
      </div>

      {loading && <p className="text-sm text-text-secondary">Carregando...</p>}
      {!loading && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Fonte
              </th>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Projeto
              </th>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Última atividade
              </th>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Mensagens
              </th>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Modelo(s)
              </th>
              <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
                Tokens (in / out / cache-read)
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((s) => (
              <tr
                key={`${s.provider}:${s.id}`}
                onClick={() => s.hasDetail && setSelected(s)}
                className={`transition-colors ${
                  s.hasDetail ? "cursor-pointer hover:bg-bg-card-hover" : "cursor-default opacity-60"
                }`}
                title={s.hasDetail ? undefined : "Detalhe local não disponível para esta sessão"}
              >
                <td className="border-b border-border px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PROVIDER_META[s.provider].badge}`}
                  >
                    {PROVIDER_META[s.provider].label}
                  </span>
                </td>
                <td className="border-b border-border px-3 py-2 text-text-primary">{s.project}</td>
                <td className="border-b border-border px-3 py-2 text-text-primary">
                  {s.lastTs ? new Date(s.lastTs).toLocaleString() : "—"}
                </td>
                <td className="border-b border-border px-3 py-2 text-text-primary">
                  {s.messageCount || "—"}
                </td>
                <td className="border-b border-border px-3 py-2 text-text-primary">
                  {s.models.join(", ") || "—"}
                </td>
                <td className="border-b border-border px-3 py-2 text-text-primary">
                  {s.usage
                    ? `${s.usage.input_tokens.toLocaleString()} / ${s.usage.output_tokens.toLocaleString()} / ${s.usage.cache_read_input_tokens.toLocaleString()}`
                    : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-text-secondary">
                  Nenhuma sessão encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selected && <SessionDetailModal session={selected} onClose={() => setSelected(null)} />}

      <Modal
        open={showUnsupported}
        onClose={() => setShowUnsupported(false)}
        title="Fontes de sessão ainda não suportadas"
        widthClass="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-text-secondary">
            Essas ferramentas guardam histórico localmente, mas em formatos que o ottocontrol ainda
            não lê:
          </p>
          {unsupported.map((u) => (
            <div key={u.id}>
              <span className="text-sm font-bold text-text-primary">{u.name}</span>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{u.reason}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function SessionDetailModal({ session, onClose }: { session: UnifiedSession; onClose: () => void }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setDetail(null);
    api.sessionDetailFor(session.provider, session.detailParams).then(setDetail);
  }, [session]);

  const filteredTurns = useMemo(() => {
    if (!detail) return [];
    const q = query.trim().toLowerCase();
    if (!q) return detail.turns;
    return detail.turns.filter((t) => t.parts.some((p) => p.text.toLowerCase().includes(q)));
  }, [detail, query]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${PROVIDER_META[session.provider].label} — ${session.project}`}
      subtitle={session.id}
      widthClass="max-w-4xl"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg-card px-5 py-3">
        <Search size={15} className="shrink-0 text-text-tertiary" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar no histórico desta sessão..."
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
        />
        {detail && !detail.detailUnavailable && (
          <span className="shrink-0 text-xs text-text-tertiary">
            {filteredTurns.length}/{detail.turns.length} mensagens
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {!detail && <p className="text-sm text-text-secondary">Carregando transcript...</p>}
        {detail?.detailUnavailable && (
          <p className="text-sm text-text-secondary">
            Esta sessão não tem um log de eventos local (comum em sessões antigas ou retomadas) —
            só os metadados de projeto/data ficaram disponíveis.
          </p>
        )}
        {detail && !detail.detailUnavailable && filteredTurns.length === 0 && (
          <p className="text-sm text-text-secondary">Nada encontrado para "{query}".</p>
        )}
        {filteredTurns.map((turn, i) => (
          <div
            key={i}
            className={`rounded-md border px-3 py-2.5 text-sm ${
              turn.role === "user"
                ? "border-border bg-bg-secondary"
                : "border-border-bright bg-bg-card-hover"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  turn.role === "user" ? "text-text-secondary" : "text-accent"
                }`}
              >
                {turn.role === "user" ? "você" : "assistente"}
              </span>
              {turn.timestamp && (
                <span className="text-[10px] text-text-tertiary">
                  {new Date(turn.timestamp).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {turn.parts.map((part, j) => (
                <div key={j}>
                  {part.kind !== "text" && (
                    <span className="mb-0.5 inline-block rounded bg-gold-glow px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
                      {KIND_LABEL[part.kind] ?? part.kind}
                    </span>
                  )}
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-primary">
                    {part.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
