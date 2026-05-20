import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("npm_execpath is not set. Run this script through npm.");
  process.exit(1);
}

const targets = [
  ["server", "dev"],
  ["server", "dev:workers"],
  ["client", "dev"]
];

const children = targets.map(([workspace, script]) => {
  const child = spawn(process.execPath, [npmCli, "run", script, "--workspace", workspace], {
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
