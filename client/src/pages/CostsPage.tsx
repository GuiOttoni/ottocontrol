import { useEffect, useState } from "react";
import { api } from "../lib/api";

type DaySummary = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  sessions: number;
};

export default function CostsPage() {
  const [byDay, setByDay] = useState<Record<string, DaySummary>>({});

  useEffect(() => {
    api.claudeSessions().then((res) => setByDay(res.byDay));
  }, []);

  const days = Object.keys(byDay).sort().reverse();
  const monthTotal = days.reduce(
    (acc, d) => {
      acc.input_tokens += byDay[d].input_tokens;
      acc.output_tokens += byDay[d].output_tokens;
      acc.cache_read_input_tokens += byDay[d].cache_read_input_tokens;
      return acc;
    },
    { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 }
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">
        Uso
      </div>
      <h2 className="m-0 text-xl font-bold text-text-primary">Consumo de tokens — Claude Code</h2>
      <p className="mt-2 mb-4 text-sm text-text-secondary">
        Contagem de tokens agregada por dia a partir dos transcripts locais. Não convertemos para
        R$/US$: o preço depende do seu plano (assinatura vs. API key) e muda com o tempo — cruze
        estes números com a Console de billing da Anthropic se usar API key própria.
      </p>

      <div className="my-4 flex gap-6">
        <div className="flex min-w-[160px] flex-col gap-1 rounded-md border border-border bg-bg-card px-5 py-3">
          <strong className="text-2xl font-bold text-text-primary">
            {monthTotal.input_tokens.toLocaleString()}
          </strong>
          <span className="text-xs text-text-secondary">tokens de entrada (total)</span>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1 rounded-md border border-border bg-bg-card px-5 py-3">
          <strong className="text-2xl font-bold text-text-primary">
            {monthTotal.output_tokens.toLocaleString()}
          </strong>
          <span className="text-xs text-text-secondary">tokens de saída (total)</span>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1 rounded-md border border-border bg-bg-card px-5 py-3">
          <strong className="text-2xl font-bold text-text-primary">
            {monthTotal.cache_read_input_tokens.toLocaleString()}
          </strong>
          <span className="text-xs text-text-secondary">tokens lidos de cache</span>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
              Dia
            </th>
            <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
              Sessões
            </th>
            <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
              Entrada
            </th>
            <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
              Saída
            </th>
            <th className="border-b border-border px-3 py-2 text-left font-medium text-text-secondary">
              Cache (criação / leitura)
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <td className="border-b border-border px-3 py-2 text-text-primary">{d}</td>
              <td className="border-b border-border px-3 py-2 text-text-primary">
                {byDay[d].sessions}
              </td>
              <td className="border-b border-border px-3 py-2 text-text-primary">
                {byDay[d].input_tokens.toLocaleString()}
              </td>
              <td className="border-b border-border px-3 py-2 text-text-primary">
                {byDay[d].output_tokens.toLocaleString()}
              </td>
              <td className="border-b border-border px-3 py-2 text-text-primary">
                {byDay[d].cache_creation_input_tokens.toLocaleString()} /{" "}
                {byDay[d].cache_read_input_tokens.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
