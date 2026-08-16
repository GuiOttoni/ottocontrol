import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

// AGENTS.md is the canonical source. Every other entry describes where
// that same content gets mirrored to, in each tool's native format.
export const CANONICAL_FILE = "AGENTS.md";

export const TOOLS = [
  {
    id: "claude",
    name: "Claude Code",
    description:
      "CLI agêntico de desenvolvimento da Anthropic — roda no terminal com acesso a arquivos, shell e ferramentas MCP.",
    docsUrl: "https://code.claude.com/docs/en/claude-directory",
    projectFile: "CLAUDE.md",
    globalFile: path.join(HOME, ".claude", "CLAUDE.md"),
    sessionsDir: path.join(HOME, ".claude", "projects"),
    kind: "plain-md",
    globalConfigFiles: [
      {
        id: "claude-md",
        label: "CLAUDE.md",
        path: path.join(HOME, ".claude", "CLAUDE.md"),
        description: "Instruções pessoais carregadas em toda sessão, em qualquer projeto.",
      },
      {
        id: "settings",
        label: "settings.json",
        path: path.join(HOME, ".claude", "settings.json"),
        description: "Permissões, hooks, modelo padrão e variáveis de ambiente aplicadas a todos os projetos.",
      },
      {
        id: "claude-json",
        label: ".claude.json",
        path: path.join(HOME, ".claude.json"),
        description: "Estado do app: sessão, tema, servidores MCP pessoais e decisões de confiança por projeto.",
      },
      {
        id: "keybindings",
        label: "keybindings.json",
        path: path.join(HOME, ".claude", "keybindings.json"),
        description: "Atalhos de teclado customizados da CLI interativa.",
      },
    ],
  },
  {
    id: "gemini",
    name: "Antigravity / Gemini CLI",
    description:
      "IDE e CLI agênticos do Google construídos sobre os modelos Gemini, para automação de código no editor ou no terminal.",
    docsUrl: "https://antigravity.google/docs/rules-workflows",
    projectFile: "GEMINI.md",
    globalFile: path.join(HOME, ".gemini", "GEMINI.md"),
    kind: "plain-md",
    globalConfigFiles: [
      {
        id: "gemini-md",
        label: "GEMINI.md",
        path: path.join(HOME, ".gemini", "GEMINI.md"),
        description: "Instruções e regras pessoais aplicadas em todos os workspaces.",
      },
    ],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    description:
      "Assistente de código da GitHub — Copilot CLI roda no terminal (~/.copilot); a extensão do VS Code usa instruções por repositório.",
    docsUrl: "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference",
    projectFile: path.join(".github", "copilot-instructions.md"),
    kind: "plain-md",
    globalConfigFiles: [
      {
        id: "instructions",
        label: "copilot-instructions.md",
        path: path.join(HOME, ".copilot", "copilot-instructions.md"),
        description: "Instruções pessoais aplicadas em todas as sessões da Copilot CLI.",
      },
      {
        id: "settings",
        label: "settings.json",
        path: path.join(HOME, ".copilot", "settings.json"),
        description: "Arquivo principal de configuração e preferências da Copilot CLI.",
      },
      {
        id: "mcp",
        label: "mcp-config.json",
        path: path.join(HOME, ".copilot", "mcp-config.json"),
        description: "Servidores MCP definidos no nível de usuário, disponíveis em todas as sessões.",
      },
      {
        id: "lsp",
        label: "lsp-config.json",
        path: path.join(HOME, ".copilot", "lsp-config.json"),
        description: "Servidores LSP no nível de usuário, para inteligência de código.",
      },
      {
        id: "permissions",
        label: "permissions-config.json",
        path: path.join(HOME, ".copilot", "permissions-config.json"),
        description: "Permissões de ferramentas e diretórios salvas por projeto.",
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    description:
      "Editor de código baseado em VS Code com IA integrada. Regras e configurações são majoritariamente por projeto — sem arquivo de instrução global documentado.",
    docsUrl: "https://cursor.com/docs/context/rules",
    projectFile: path.join(".cursor", "rules", "main.mdc"),
    kind: "mdc",
    globalConfigFiles: [],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description:
      "Editor de código da Codeium com o agente Cascade — combina memórias globais e regras por projeto.",
    docsUrl: "https://docs.windsurf.com/windsurf/cascade/memories",
    projectFile: ".windsurfrules",
    globalFile: path.join(HOME, ".codeium", "windsurf", "memories", "global_rules.md"),
    kind: "plain-md",
    globalConfigFiles: [
      {
        id: "global-rules",
        label: "global_rules.md",
        path: path.join(HOME, ".codeium", "windsurf", "memories", "global_rules.md"),
        description: "Regras e memórias pessoais aplicadas em todos os workspaces.",
      },
      {
        id: "mcp",
        label: "mcp_config.json",
        path: path.join(HOME, ".codeium", "windsurf", "mcp_config.json"),
        description: "Servidores MCP configurados para o agente Cascade.",
      },
    ],
  },
  {
    id: "aider",
    name: "Aider",
    description:
      "Assistente de pair programming via terminal, open-source, que edita arquivos direto no seu repositório git local.",
    docsUrl: "https://aider.chat/docs/config/aider_conf.html",
    projectFile: "CONVENTIONS.md",
    kind: "plain-md",
    globalConfigFiles: [
      {
        id: "conf",
        label: ".aider.conf.yml",
        path: path.join(HOME, ".aider.conf.yml"),
        description: "Configuração global: modelo padrão, flags de execução e caminho para CONVENTIONS.md.",
      },
    ],
  },
];

export const SYNC_HEADER =
  "<!-- Synced from AGENTS.md by agent-hub. Edit AGENTS.md, not this file. -->\n\n";

export function mdcFrontmatter() {
  return [
    "---",
    "description: Shared project instructions (synced from AGENTS.md)",
    "alwaysApply: true",
    "---",
    "",
  ].join("\n");
}
