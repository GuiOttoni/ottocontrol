# ottocontrol

*[Leia em português](README-BR.md)*

A local control center for developers juggling multiple AI coding agents (Claude Code, GitHub Copilot, Gemini CLI/Antigravity, Cursor, Windsurf, Aider) across multiple projects at once.

Runs 100% locally — nothing ever leaves your machine — and pulls into one dashboard what's normally scattered across config folders, terminals, and different editors.

## What it does

- **Instructions** — keeps `AGENTS.md` as the canonical source per project and syncs its content into each tool's native format (`CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`, `CONVENTIONS.md`, `GEMINI.md`), with protection against overwriting content that was already there. Also edits each agent's **global** (user-folder) instructions — `CLAUDE.md`, `settings.json`, `.claude.json`, `copilot-instructions.md`, `mcp-config.json`, and more — with a direct link to each one's official docs.
- **Sessions** — unified, searchable session history across Claude Code, GitHub Copilot CLI, and Gemini CLI/Antigravity, read straight from each tool's local files. Any session can be **resumed in a real terminal** (xterm.js + a native PTY over WebSocket), running `--resume` on the original CLI without leaving the dashboard.
- **Tokens/Costs** — Claude Code token usage aggregated by day.
- **Projects** — recursively scans your projects folder, auto-detects whether each one is frontend/backend/fullstack/infra, shows the git branch and remote, a file tree, the README, and buttons to open the project in VS Code or a terminal.
- **Resource Monitor** — how much memory and CPU ottocontrol itself, AI agent sessions (Claude/Copilot/Gemini), other Node/npm processes, .NET, Java, Python, and Docker containers are using on the machine.
- **Settings** — projects folder, home folder, and per-agent folders, all persisted in `~/.ottocontrol/config.json`.

## Install

```bash
npm install -g ottocontrol
```

## Basic usage

```bash
ottocontrol up       # starts the dashboard and opens it in your browser
ottocontrol status    # shows whether it's running and on which port
ottocontrol down      # stops the dashboard
```

Defaults to `http://localhost:4310`. To use a different port:

```bash
ottocontrol up --port 4400
```

Settings (projects folder, per-agent folders, etc.) live in `~/.ottocontrol/config.json` and can be edited right from the dashboard's **Settings** tab.

## Local development

This repo is a simple monorepo: `server/` (Express) + `client/` (Vite + React + Tailwind) + `package/` (the npm-published CLI packaging).

```bash
npm install       # at the root, installs the orchestrator's deps (concurrently)
npm run dev        # brings up server (:4310) + client (:5173) together, with hot-reload
```

## Publishing a new version to npm

Publishing is automatic: creating a **GitHub release** triggers `.github/workflows/publish.yml`, which syncs the package version to the release tag, builds, and publishes via **npm Trusted Publishing (OIDC)** — no token/secret required.

To build and test locally before cutting a release:

```bash
cd package
npm run build              # generates package/dist/ (copies the server + builds the client)
npm install -g .           # optional: test the global local install
```

Or with the helper script (Windows): `package\publish.bat [build|local|publish]`.

## Roadmap

- Support for reading Cursor and Windsurf session history (currently stored in the editor's internal SQLite databases, with no documented format).
- A presentation page on [ottosite](https://github.com/GuiOttoni/ottosite).
