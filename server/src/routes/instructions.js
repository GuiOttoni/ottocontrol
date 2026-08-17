import { Router } from "express";
import fs from "node:fs";
import { TOOLS } from "../lib/tools.js";
import { readCanonical, writeCanonical, driftReport } from "../lib/sync.js";
import { listGlobalConfig, writeGlobalConfigFile, listSupportedAgents } from "../lib/global-instructions.js";

const router = Router();

router.get("/global", (req, res) => {
  res.json({ agents: listGlobalConfig() });
});

router.put("/global", (req, res) => {
  const { tool, fileId, content } = req.body ?? {};
  if (!tool || !fileId || typeof content !== "string") {
    return res.status(400).json({ error: "body requires { tool, fileId, content }" });
  }
  try {
    const result = writeGlobalConfigFile(tool, fileId, content);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/supported-agents", (req, res) => {
  res.json({ agents: listSupportedAgents() });
});

router.get("/", (req, res) => {
  const projectRoot = req.query.projectRoot;
  if (!projectRoot) return res.status(400).json({ error: "missing ?projectRoot=" });

  const canonical = readCanonical(projectRoot);
  const mirrors = driftReport(projectRoot);
  res.json({ tools: TOOLS.map((t) => t.id), canonical, mirrors });
});

router.put("/", (req, res) => {
  const { projectRoot, content, overwriteForeign } = req.body ?? {};
  if (!projectRoot || typeof content !== "string") {
    return res.status(400).json({ error: "body requires { projectRoot, content }" });
  }
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    return res.status(404).json({ error: "projectRoot not found" });
  }
  const results = writeCanonical(projectRoot, content, overwriteForeign ?? []);
  res.json({ ok: true, synced: results });
});

export default router;
