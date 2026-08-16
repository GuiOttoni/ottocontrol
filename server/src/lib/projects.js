import fs from "node:fs";
import path from "node:path";

const FRONTEND_DEPS = ["react", "vue", "svelte", "next", "astro", "@angular/core"];
const BACKEND_DEPS = ["express", "fastify", "koa", "@nestjs/core", "hapi"];

const NON_JS_BACKEND_FILES = [
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "Gemfile",
  "composer.json",
];

const INFRA_FILES = [
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Chart.yaml",
];

const INFRA_DIRS = ["k8s", "kubernetes"];

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function listTopLevel(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// Inspects a directory's top-level files to classify its stack.
export function detectProjectType(dir) {
  const entries = listTopLevel(dir);
  const names = entries.map((e) => e.name);
  const techHints = [];

  let frontend = false;
  let backend = false;
  let infra = false;

  // package.json dependency signals
  const pkgFile = path.join(dir, "package.json");
  if (fs.existsSync(pkgFile)) {
    const pkg = readJsonSafe(pkgFile);
    if (pkg) {
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      const depNames = Object.keys(deps);

      for (const dep of FRONTEND_DEPS) {
        if (depNames.includes(dep)) {
          frontend = true;
          techHints.push(dep.replace(/^@.*\//, ""));
        }
      }
      for (const dep of BACKEND_DEPS) {
        if (depNames.includes(dep)) {
          backend = true;
          techHints.push(dep.replace(/^@.*\//, ""));
        }
      }
      // vite alongside a framework is a frontend signal
      if (depNames.includes("vite")) {
        techHints.push("vite");
        if (frontend) {
          // already frontend, vite just reinforces it
        }
      }
    }
  }

  // Non-JS backend manifests
  for (const f of NON_JS_BACKEND_FILES) {
    if (names.includes(f)) {
      backend = true;
      techHints.push(f);
    }
  }
  // .NET: shallow glob for *.csproj / *.sln
  const dotnet = names.find((n) => n.endsWith(".csproj") || n.endsWith(".sln"));
  if (dotnet) {
    backend = true;
    techHints.push(".NET");
  }

  // Infra signals
  for (const f of INFRA_FILES) {
    if (names.includes(f)) {
      infra = true;
      techHints.push(f.startsWith("docker-compose") ? "docker-compose" : f.toLowerCase());
    }
  }
  const tf = names.find((n) => n.endsWith(".tf"));
  if (tf) {
    infra = true;
    techHints.push("terraform");
  }
  for (const d of INFRA_DIRS) {
    if (names.includes(d)) {
      infra = true;
      techHints.push(d);
    }
  }

  let type = "unknown";
  if (frontend && backend) type = "fullstack";
  else if (frontend) type = "frontend";
  else if (backend) type = "backend";
  else if (infra) type = "infra";

  return { type, techHints: [...new Set(techHints)] };
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// Inspects `.git` metadata (branch + remote) without shelling out to git.
export function getGitInfo(dir) {
  const gitDir = path.join(dir, ".git");
  const result = { hasGit: false, branch: null, remoteUrl: null };

  if (!fs.existsSync(gitDir)) return result;
  result.hasGit = true;

  try {
    const head = readFileSafe(path.join(gitDir, "HEAD"));
    if (head) {
      const match = head.trim().match(/^ref:\s*refs\/heads\/(.+)$/);
      result.branch = match ? match[1] : "detached";
    }
  } catch {
    // leave branch as null
  }

  try {
    const config = readFileSafe(path.join(gitDir, "config"));
    if (config) {
      const originMatch = config.match(/\[remote\s+"origin"\][^[]*/);
      if (originMatch) {
        const urlMatch = originMatch[0].match(/url\s*=\s*(.+)/);
        if (urlMatch) result.remoteUrl = urlMatch[1].trim();
      }
    }
  } catch {
    // leave remoteUrl as null
  }

  return result;
}

function isProjectDir(dir) {
  if (fs.existsSync(path.join(dir, "package.json"))) return true;
  if (fs.existsSync(path.join(dir, ".git"))) return true;

  const names = listTopLevel(dir).map((e) => e.name);
  for (const f of [...NON_JS_BACKEND_FILES, ...INFRA_FILES]) {
    if (names.includes(f)) return true;
  }
  if (names.some((n) => n.endsWith(".csproj") || n.endsWith(".sln") || n.endsWith(".tf"))) {
    return true;
  }
  if (INFRA_DIRS.some((d) => names.includes(d))) return true;

  return false;
}

// Walks into a directory: any subdirectory that looks like a project is
// recorded and NOT descended into further (its internal folders — src,
// node_modules, etc — shouldn't surface as separate "projects"). Anything
// else (a plain grouping folder like "Ativos") gets recursed into, up to
// `maxDepth` levels, so nested project trees are still found.
function scanDir(dir, depth, maxDepth, projects) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const sub = path.join(dir, entry.name);
    if (isProjectDir(sub)) {
      projects.push({
        name: entry.name,
        path: sub,
        ...detectProjectType(sub),
        ...getGitInfo(sub),
      });
    } else {
      scanDir(sub, depth + 1, maxDepth, projects);
    }
  }
}

// Recursively scans `root` for recognizable projects, up to `maxDepth`
// levels deep (default 5) — enough to cover a grouping folder like
// `Ativos/` that itself contains real projects one or two levels down.
export function listProjects(root, maxDepth = 5) {
  if (!fs.existsSync(root)) return [];
  const projects = [];
  scanDir(root, 1, maxDepth, projects);
  return projects;
}
