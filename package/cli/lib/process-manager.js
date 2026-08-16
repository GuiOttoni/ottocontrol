import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { HOME_DIR, PIDS_FILE, SERVER_JS } from "./paths.js";

export function savePid(pid) {
  if (!existsSync(HOME_DIR)) mkdirSync(HOME_DIR, { recursive: true });
  writeFileSync(PIDS_FILE, JSON.stringify({ server: pid }));
}

export function readPid() {
  if (!existsSync(PIDS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(PIDS_FILE, "utf8")).server ?? null;
  } catch {
    return null;
  }
}

export function clearPid() {
  if (existsSync(PIDS_FILE)) unlinkSync(PIDS_FILE);
}

export function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killProcess(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already dead
  }
}

export async function waitForPort(port, timeoutMs = 15_000, path = "/api/health") {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}${path}`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export function spawnServer(port) {
  return spawn(process.execPath, [SERVER_JS], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: String(port) },
  });
}
