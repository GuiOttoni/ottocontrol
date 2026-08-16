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

const PORT = process.env.PORT || 4310;
app.listen(PORT, () => console.log(`ottocontrol server on http://localhost:${PORT}`));
