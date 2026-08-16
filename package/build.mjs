#!/usr/bin/env node
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";

console.log("🧹 Cleaning dist...");
rmSync(dist, { recursive: true, force: true });
mkdirSync(`${dist}/server`, { recursive: true });

// ── Server (Express) ─────────────────────────────────────────────────────────
// No bundling needed: it's plain ESM with only express/cors as deps, both
// declared in this package's own package.json so npm installs them
// alongside the CLI when the package is installed.
console.log("⚙️  Copying server...");
cpSync("../server/src", `${dist}/server`, { recursive: true });

// ── Client (Vite/React static build) ─────────────────────────────────────────
console.log("⚙️  Building client (this may take a minute)...");
execSync("npm install", { cwd: "../client", stdio: "inherit" });
execSync("npm run build", { cwd: "../client", stdio: "inherit" });

const clientDist = `${dist}/client`;
mkdirSync(clientDist, { recursive: true });
cpSync("../client/dist", clientDist, { recursive: true });

// ── README ────────────────────────────────────────────────────────────────────
if (existsSync("../README.md")) {
  cpSync("../README.md", "README.md");
}

console.log("✅ Build complete → dist/");
