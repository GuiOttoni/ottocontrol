import { useState } from "react";
import { FileText, History, Coins, FolderGit2, Settings, ActivitySquare } from "lucide-react";
import InstructionsPage from "./pages/InstructionsPage";
import SessionsPage from "./pages/SessionsPage";
import CostsPage from "./pages/CostsPage";
import ProjectsPage from "./pages/ProjectsPage";
import SettingsPage from "./pages/SettingsPage";
import ResourceMonitorPage from "./pages/ResourceMonitorPage";

const TABS = [
  { id: "instructions", label: "Instruções", icon: FileText, el: InstructionsPage },
  { id: "sessions", label: "Sessões", icon: History, el: SessionsPage },
  { id: "costs", label: "Tokens/Custos", icon: Coins, el: CostsPage },
  { id: "projects", label: "Projetos", icon: FolderGit2, el: ProjectsPage },
  { id: "resources", label: "Monitor de Recursos", icon: ActivitySquare, el: ResourceMonitorPage },
  { id: "settings", label: "Configurações", icon: Settings, el: SettingsPage },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("instructions");
  const Active = TABS.find((t) => t.id === tab)!.el;

  return (
    <div className="relative flex h-screen bg-bg-deep text-text-primary">
      <div className="app-grid-bg" />
      <aside className="relative z-10 flex w-56 shrink-0 flex-col border-r border-border bg-bg-primary">
        <div className="px-5 py-6">
          <span className="font-mono text-lg font-bold tracking-tight">
            <span className="text-accent">[</span>
            <span className="text-text-primary">OTTOCONTROL</span>
            <span className="text-accent">]</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-all ${
                  active
                    ? "border-border-glow bg-bg-card text-accent shadow-[0_0_12px_var(--accent-glow)]"
                    : "border-transparent text-text-secondary hover:border-border hover:bg-bg-card-hover hover:text-text-primary"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="relative z-10 min-w-0 flex-1 overflow-hidden">
        <Active />
      </main>
    </div>
  );
}
