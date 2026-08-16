import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Root of the installed npm package (cli/lib/paths.js -> ../.. = package root)
export const PKG_ROOT = join(__dirname, "..", "..");
export const SERVER_JS = join(PKG_ROOT, "dist", "server", "index.js");

// Same ~/.ottocontrol dir the app itself uses for config.json — the CLI
// just adds its own pid/log files alongside it.
export const HOME_DIR = join(homedir(), ".ottocontrol");
export const PIDS_FILE = join(HOME_DIR, "pids.json");
