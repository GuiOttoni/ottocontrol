import fs from "node:fs";
import path from "node:path";
import { TOOLS } from "./tools.js";

// Only tools with at least one documented global/user-level config file are
// listed here — Cursor has no equivalent, since its rules live exclusively
// per-repo.
const GLOBAL_TOOLS = TOOLS.filter((t) => (t.globalConfigFiles ?? []).length > 0);

export function listGlobalConfig() {
  return GLOBAL_TOOLS.map((tool) => ({
    tool: tool.id,
    name: tool.name,
    description: tool.description,
    docsUrl: tool.docsUrl,
    files: tool.globalConfigFiles.map((f) => {
      const exists = fs.existsSync(f.path);
      return {
        id: f.id,
        label: f.label,
        path: f.path,
        description: f.description,
        exists,
        content: exists ? fs.readFileSync(f.path, "utf8") : "",
      };
    }),
  }));
}

export function writeGlobalConfigFile(toolId, fileId, content) {
  const tool = GLOBAL_TOOLS.find((t) => t.id === toolId);
  if (!tool) throw new Error(`unknown or non-global tool: ${toolId}`);
  const file = tool.globalConfigFiles.find((f) => f.id === fileId);
  if (!file) throw new Error(`unknown config file "${fileId}" for tool "${toolId}"`);

  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  fs.writeFileSync(file.path, content, "utf8");
  return { tool: toolId, file: fileId, path: file.path };
}

// Lightweight roster (name, description, docs link) for every supported
// tool, including ones without global config — used by the "which CLIs
// does ottocontrol support" tooltip.
export function listSupportedAgents() {
  return TOOLS.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    docsUrl: t.docsUrl,
    hasGlobalConfig: (t.globalConfigFiles ?? []).length > 0,
  }));
}
