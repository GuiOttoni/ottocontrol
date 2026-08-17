import { exec } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

// Names of the process kinds we care about — everything else on the system
// is noise for a "developer control center" resource view.
const NAME_FILTER =
  "^(node\\.exe|npm\\.exe|dotnet\\.exe|java(w)?\\.exe|python(w|3)?\\.exe|Docker Desktop\\.exe|com\\.docker\\.backend\\.exe|dockerd\\.exe|vmmem.*)$";

// Win32_PerfFormattedData_PerfProc_Process already gives CPU% and working-set
// pre-computed (a running rate, not a raw counter) — avoids sampling twice
// and diffing ourselves. Joined by PID against Win32_Process for the
// command line, which is what we classify processes with.
function buildPsScript() {
  return `
$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '${NAME_FILTER}' } | Select-Object ProcessId, Name, CommandLine, ParentProcessId
$ids = $procs | ForEach-Object { $_.ProcessId }
$perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $ids -contains $_.IDProcess } | Select-Object IDProcess, PercentProcessorTime, WorkingSetPrivate
$perfMap = @{}
foreach ($p in $perf) { $perfMap[[int]$p.IDProcess] = $p }
$result = foreach ($proc in $procs) {
  $pf = $perfMap[[int]$proc.ProcessId]
  [PSCustomObject]@{
    pid = $proc.ProcessId
    name = $proc.Name
    commandLine = $proc.CommandLine
    parentPid = $proc.ParentProcessId
    cpuPercent = if ($pf) { [int]$pf.PercentProcessorTime } else { 0 }
    memoryBytes = if ($pf) { [int64]$pf.WorkingSetPrivate } else { 0 }
  }
}
ConvertTo-Json -InputObject @($result) -Compress
`.trim();
}

function runPowerShell(script, timeout = 15000) {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `ottocontrol-ps-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
    fs.writeFileSync(tmpFile, script, "utf8");
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`,
      { maxBuffer: 20 * 1024 * 1024, timeout, windowsHide: true },
      (err, stdout) => {
        fs.unlink(tmpFile, () => {});
        if (err) return resolve(null);
        resolve(stdout);
      }
    );
  });
}

// Best-effort classification from process name + command line. Order
// matters: agent CLIs (Claude/Copilot/Gemini) all run on `node.exe`, so
// they must be matched by command-line signature before the generic
// "node-other" bucket catches them.
function classify(proc) {
  const cl = proc.commandLine || "";
  const name = (proc.name || "").toLowerCase();

  if (/ottocontrol/i.test(cl)) return "ottocontrol";
  if (/\.claude[\\/]|claude-code|@anthropic-ai/i.test(cl)) return "claude";
  if (/copilot/i.test(cl)) return "copilot";
  if (/gemini|antigravity/i.test(cl)) return "gemini";
  if (name === "dotnet.exe") return "dotnet";
  if (name.startsWith("java")) return "java";
  if (name.startsWith("python")) return "python";
  if (name.includes("docker") || name.startsWith("vmmem")) return "docker";
  if (name === "node.exe" || name === "npm.exe") return "node-other";
  return "other";
}

const CATEGORY_LABELS = {
  ottocontrol: "ottocontrol",
  claude: "Claude Code",
  copilot: "GitHub Copilot",
  gemini: "Gemini / Antigravity",
  dotnet: ".NET",
  java: "Java",
  python: "Python",
  docker: "Docker",
  "node-other": "Node.js / npm (outros)",
  other: "Outros",
};

export async function getProcessSnapshot() {
  const stdout = await runPowerShell(buildPsScript());
  if (!stdout) return { categories: [], processes: [] };

  let raw;
  try {
    raw = JSON.parse(stdout);
  } catch {
    return { categories: [], processes: [] };
  }
  if (!Array.isArray(raw)) raw = raw ? [raw] : [];

  // Win32_PerfFormattedData_PerfProc_Process reports CPU% per-core (a
  // process pinning 2 of 16 cores shows 200%), which is how Windows'
  // own perf counters work but reads as nonsense in a summed category
  // total. Normalize to "% of total system capacity" — 0-100 overall —
  // matching what Task Manager's default view shows.
  const cpuCount = os.cpus().length || 1;
  const processes = raw.map((p) => ({
    pid: p.pid,
    name: p.name,
    category: classify(p),
    commandLine: p.commandLine ?? null,
    cpuPercent: Math.round(((p.cpuPercent ?? 0) / cpuCount) * 10) / 10,
    memoryBytes: p.memoryBytes ?? 0,
  }));

  const byCategory = new Map();
  for (const p of processes) {
    if (!byCategory.has(p.category)) {
      byCategory.set(p.category, { category: p.category, label: CATEGORY_LABELS[p.category] ?? p.category, count: 0, cpuPercent: 0, memoryBytes: 0 });
    }
    const c = byCategory.get(p.category);
    c.count++;
    c.cpuPercent += p.cpuPercent;
    c.memoryBytes += p.memoryBytes;
  }

  for (const c of byCategory.values()) c.cpuPercent = Math.round(c.cpuPercent * 10) / 10;

  const categories = [...byCategory.values()].sort((a, b) => b.memoryBytes - a.memoryBytes);
  processes.sort((a, b) => b.memoryBytes - a.memoryBytes);

  return { categories, processes };
}

export function getSystemInfo() {
  return {
    totalMemBytes: os.totalmem(),
    freeMemBytes: os.freemem(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? null,
    platform: os.platform(),
  };
}

export function getSelfUsage() {
  const mem = process.memoryUsage();
  return { pid: process.pid, rssBytes: mem.rss, heapUsedBytes: mem.heapUsed };
}

export function getDockerContainerStats() {
  return new Promise((resolve) => {
    exec(
      'docker stats --no-stream --format "{{json .}}"',
      { timeout: 8000, maxBuffer: 5 * 1024 * 1024, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return resolve({ available: false, containers: [] });
        try {
          const containers = stdout
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const c = JSON.parse(line);
              return {
                id: c.ID,
                name: c.Name,
                cpuPercent: parseFloat(c.CPUPerc) || 0,
                memUsage: c.MemUsage,
                memPercent: parseFloat(c.MemPerc) || 0,
              };
            });
          resolve({ available: true, containers });
        } catch {
          resolve({ available: false, containers: [] });
        }
      }
    );
  });
}
