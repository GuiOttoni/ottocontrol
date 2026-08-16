import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".ottocontrol");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS = {
  projectsFolder: "F:/projetos",
  homeFolder: os.homedir(),
  agentFolders: {
    claude: path.join(os.homedir(), ".claude"),
    cursor: path.join(os.homedir(), ".cursor"),
    gemini: path.join(os.homedir(), ".gemini"),
    windsurf: path.join(os.homedir(), ".codeium", "windsurf"),
    aider: "",
    copilot: "",
  },
  // Free-form bucket for anything that doesn't need its own top-level field.
  custom: {},
};

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2), "utf8");
  }
}

export function readConfig() {
  ensureConfigFile();
  const onDisk = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  return {
    ...DEFAULTS,
    ...onDisk,
    agentFolders: { ...DEFAULTS.agentFolders, ...(onDisk.agentFolders ?? {}) },
    custom: { ...DEFAULTS.custom, ...(onDisk.custom ?? {}) },
  };
}

export function writeConfig(partial) {
  const current = readConfig();
  const next = {
    ...current,
    ...partial,
    agentFolders: { ...current.agentFolders, ...(partial.agentFolders ?? {}) },
    custom: { ...current.custom, ...(partial.custom ?? {}) },
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getProjectsFolder() {
  return readConfig().projectsFolder;
}

export { CONFIG_DIR, CONFIG_FILE, DEFAULTS };
