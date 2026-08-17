import { WebSocketServer } from "ws";
import fs from "node:fs";
import { buildResumeCommand } from "./resume-commands.js";

// node-pty is a native module (optionalDependency) — it can fail to
// install on a given machine/platform without breaking the rest of
// ottocontrol. Loaded lazily so a missing/broken install only disables
// the "resume session" terminal, nothing else.
let pty = null;
let ptyLoadError = null;
try {
  pty = (await import("node-pty")).default;
} catch (err) {
  ptyLoadError = err;
}

// Attaches a `/ws/terminal` WebSocket endpoint to the existing HTTP server
// that spawns a real PTY (via node-pty) running the right `--resume`
// command for the session's provider, so the client's xterm.js instance
// gets a genuinely interactive terminal — not just piped stdout.
export function attachTerminalServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/terminal" });

  if (!pty) {
    console.warn(
      `[ottocontrol] node-pty indisponível (${ptyLoadError?.message ?? "não instalado"}) — "Retomar sessão" ficará desabilitado.`
    );
  }

  wss.on("connection", (ws, req) => {
    if (!pty) {
      ws.send(
        JSON.stringify({
          type: "data",
          data: "\r\n\x1b[31mTerminal indisponível: node-pty não está instalado nesta máquina.\x1b[0m\r\n",
        })
      );
      ws.close();
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const provider = url.searchParams.get("provider") ?? "";
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const requestedCwd = url.searchParams.get("cwd");
    const cwd = requestedCwd && fs.existsSync(requestedCwd) ? requestedCwd : process.cwd();

    const { file, args, note } = buildResumeCommand(provider, sessionId);

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(file, args, {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd,
        env: process.env,
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: "data", data: `\r\nFalha ao iniciar terminal: ${err.message}\r\n` }));
      ws.close();
      return;
    }

    if (note) {
      ws.send(JSON.stringify({ type: "data", data: `\x1b[33m${note}\x1b[0m\r\n\r\n` }));
    }

    ptyProcess.onData((data) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "data", data }));
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "exit", code: exitCode }));
        ws.close();
      }
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "input") ptyProcess.write(msg.data);
      else if (msg.type === "resize" && msg.cols > 0 && msg.rows > 0) {
        try {
          ptyProcess.resize(msg.cols, msg.rows);
        } catch {
          // pty already gone
        }
      }
    });

    ws.on("close", () => {
      try {
        ptyProcess.kill();
      } catch {
        // already dead
      }
    });
  });

  return wss;
}
