# ottocontrol

Central de controle local para desenvolvedores que trabalham com múltiplos agentes de IA (Claude Code, GitHub Copilot, Gemini CLI/Antigravity, Cursor, Windsurf, Aider) e múltiplos projetos ao mesmo tempo.

Roda 100% local — sem enviar nada para fora da sua máquina — e reúne num único dashboard o que hoje fica espalhado entre pastas de configuração, terminais e editores diferentes.

## O que ele faz

- **Instruções** — mantém `AGENTS.md` como fonte canônica por projeto e sincroniza o conteúdo para o formato nativo de cada ferramenta (`CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`, `CONVENTIONS.md`, `GEMINI.md`), com proteção contra sobrescrever conteúdo que já existia. Também edita as instruções **globais** (pasta do usuário) de cada agente — `CLAUDE.md`, `settings.json`, `.claude.json`, `copilot-instructions.md`, `mcp-config.json` e outras — com link direto pra documentação oficial de cada um.
- **Sessões** — histórico unificado e pesquisável de sessões do Claude Code, GitHub Copilot CLI e Gemini CLI/Antigravity, lido diretamente dos arquivos locais de cada ferramenta. Cada sessão pode ser **retomada num terminal de verdade** (xterm.js + PTY nativo via WebSocket), rodando `--resume` na CLI original sem sair do dashboard.
- **Tokens/Custos** — consumo de tokens do Claude Code agregado por dia.
- **Projetos** — escaneia recursivamente sua pasta de projetos, identifica automaticamente se cada um é frontend/backend/fullstack/infra, mostra branch e remote do git, árvore de arquivos, README, e tem botões para abrir o projeto no VS Code ou num terminal.
- **Monitor de Recursos** — quanto de memória e CPU o próprio ottocontrol, as sessões de agentes IA (Claude/Copilot/Gemini), outros processos Node/npm, .NET, Java, Python e containers Docker estão consumindo na máquina.
- **Configurações** — pasta de projetos, pasta do usuário e pasta de cada agente, tudo persistido em `~/.ottocontrol/config.json`.

## Instalação

```bash
npm install -g ottocontrol
```

## Uso básico

```bash
ottocontrol up       # inicia o dashboard e abre no navegador
ottocontrol status    # mostra se está rodando e em qual porta
ottocontrol down      # para o dashboard
```

Por padrão sobe em `http://localhost:4310`. Pra usar outra porta:

```bash
ottocontrol up --port 4400
```

Configurações (pasta de projetos, pastas por agente etc.) ficam em `~/.ottocontrol/config.json` e podem ser editadas pela própria aba **Configurações** do dashboard.

## Desenvolvimento local

Este repositório é um monorepo simples: `server/` (Express) + `client/` (Vite + React + Tailwind) + `package/` (empacotamento do CLI publicado no npm).

```bash
npm install       # na raiz, instala as deps do orquestrador (concurrently)
npm run dev        # sobe server (:4310) + client (:5173) juntos, com hot-reload
```

## Publicar uma nova versão no npm

```bash
cd package
npm run build              # gera package/dist/ (copia o server + builda o client)
npm install -g .           # opcional: testa a instalação global local antes de publicar
npm publish --access public
```

Ou usando o helper (Windows): `package\publish.bat [build|local|publish]`.

## Roadmap

- Suporte a leitura de histórico de sessões do Cursor e Windsurf (hoje ficam em bancos SQLite internos do editor, sem formato documentado).
- Página de apresentação em [ottosite](https://github.com/GuiOttoni/ottosite).
