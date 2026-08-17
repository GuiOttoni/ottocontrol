// node-pty has a known race on Windows (its ConPTY kill() path can throw
// `Cannot read properties of undefined (reading 'forEach')` from an
// internal, unhandled promise when a terminal is closed quickly) that
// would otherwise take the whole app down with it. A crash here must
// never cost the rest of ottocontrol — log and keep serving.
process.on("unhandledRejection", (reason) => {
  console.error("[ottocontrol] unhandled rejection (ignorada):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[ottocontrol] uncaught exception (ignorada):", err);
});

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import projectsRouter from "./routes/projects.js";
import instructionsRouter from "./routes/instructions.js";
import sessionsRouter from "./routes/sessions.js";
import settingsRouter from "./routes/settings.js";
import resourcesRouter from "./routes/resources.js";
import { TOOLS } from "./lib/tools.js";
import { attachTerminalServer } from "./lib/terminal-server.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/tools", (req, res) => res.json({ tools: TOOLS }));
app.use("/api/projects", projectsRouter);
app.use("/api/instructions", instructionsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/resources", resourcesRouter);

// When installed as the global `ottocontrol` CLI, the built client sits in
// a sibling `client/` dir alongside this file (see package/build.mjs). In
// local dev that directory doesn't exist — Vite serves the client instead
// on its own port — so this is a no-op there.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// Catches both synchronous throws (Express 4 already funnels these here on
// its own) and, via routes wrapped in asyncRoute(), rejected promises from
// async handlers — so a bad request degrades to a clean JSON 500 instead of
// an unstyled HTML error page or (for the async case) a hung connection.
app.use((err, req, res, next) => {
  console.error("[ottocontrol] request error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "internal error" });
});

const PORT = process.env.PORT || 4310;
const httpServer = app.listen(PORT, () => console.log(`ottocontrol server on http://localhost:${PORT}`));
attachTerminalServer(httpServer);
