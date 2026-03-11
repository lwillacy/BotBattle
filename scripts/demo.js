#!/usr/bin/env node
/**
 * Demo Mode startup script.
 * Runs migrations, seeds demo data, then starts backend + frontend together.
 *
 * Usage:
 *   npm run demo          (from repo root)
 *   node scripts/demo.js  (directly)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SERVER_DIR = path.join(ROOT, "apps", "server");
const WEB_DIR = path.join(ROOT, "apps", "web");

function log(msg) {
  process.stdout.write(`\n${msg}\n`);
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

// ── Step 1: Generate Prisma client ────────────────────────────────────────────
log("🔧  Generating Prisma client...");
try {
  run("npx prisma generate", SERVER_DIR);
} catch {
  process.stderr.write("\n❌  Prisma generate failed.\n");
  process.exit(1);
}

// ── Step 2: Migrate ───────────────────────────────────────────────────────────
log("📦  Running database migrations...");
try {
  run("npx prisma migrate deploy", SERVER_DIR);
} catch {
  process.stderr.write(
    "\n❌  Migration failed. Is DATABASE_URL set in apps/server/.env?\n"
  );
  process.exit(1);
}

// ── Step 3: Seed ──────────────────────────────────────────────────────────────
log("🌱  Seeding demo data...");
try {
  run("npm run prisma:seed", SERVER_DIR);
} catch {
  process.stderr.write("\n❌  Seed failed.\n");
  process.exit(1);
}

// ── Step 4: Start services ────────────────────────────────────────────────────
log("🚀  Starting services...");
process.stdout.write("    Backend  → http://localhost:3000\n");
process.stdout.write("    Frontend → http://localhost:3001\n");
process.stdout.write(
  "\n    Open http://localhost:3001/demo and click Run Demo Match\n\n"
);

const backend = spawn("npm", ["run", "dev"], {
  cwd: SERVER_DIR,
  env: { ...process.env, DEMO_MODE: "true" },
  stdio: "inherit",
  shell: process.platform === "win32",
});

const frontend = spawn("npm", ["run", "dev"], {
  cwd: WEB_DIR,
  env: { ...process.env },
  stdio: "inherit",
  shell: process.platform === "win32",
});

// ── Cleanup on exit ───────────────────────────────────────────────────────────
let exiting = false;

function cleanup() {
  if (exiting) return;
  exiting = true;
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

backend.on("close", (code) => {
  if (!exiting && code !== 0) {
    process.stderr.write(`\n⚠️  Backend exited with code ${code}\n`);
    cleanup();
    process.exit(code ?? 1);
  }
});

frontend.on("close", (code) => {
  if (!exiting && code !== 0) {
    process.stderr.write(`\n⚠️  Frontend exited with code ${code}\n`);
    cleanup();
    process.exit(code ?? 1);
  }
});
