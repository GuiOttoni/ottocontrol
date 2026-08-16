import { Router } from "express";
import fs from "node:fs";
import { scanWorkspace } from "../lib/scan.js";
import { listProjects } from "../lib/projects.js";
import { getProjectsFolder } from "../lib/config.js";
import { buildTree, findReadme, openInVSCode, openTerminal } from "../lib/project-detail.js";

const router = Router();

router.get("/scan", (req, res) => {
  const root = req.query.root;
  if (!root) return res.status(400).json({ error: "missing ?root= query param" });
  res.json({ root, projects: scanWorkspace(root) });
});

router.get("/list", (req, res) => {
  const root = req.query.root || getProjectsFolder();
  const maxDepth = req.query.maxDepth ? Number(req.query.maxDepth) : undefined;
  res.json({ root, projects: listProjects(root, maxDepth) });
});

function requireValidDir(req, res) {
  const dir = req.query.path ?? req.body?.path;
  if (!dir) {
    res.status(400).json({ error: "missing path" });
    return null;
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    res.status(404).json({ error: "directory not found" });
    return null;
  }
  return dir;
}

router.get("/tree", (req, res) => {
  const dir = requireValidDir(req, res);
  if (!dir) return;
  res.json({ tree: buildTree(dir) });
});

router.get("/readme", (req, res) => {
  const dir = requireValidDir(req, res);
  if (!dir) return;
  res.json({ readme: findReadme(dir) });
});

router.post("/open-vscode", async (req, res) => {
  const dir = requireValidDir(req, res);
  if (!dir) return;
  res.json(await openInVSCode(dir));
});

router.post("/open-terminal", async (req, res) => {
  const dir = requireValidDir(req, res);
  if (!dir) return;
  res.json(await openTerminal(dir));
});

export default router;
