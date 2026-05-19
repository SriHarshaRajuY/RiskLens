import { spawnSync } from "node:child_process";

const [scriptName, ...workspaces] = process.argv.slice(2);

if (!scriptName || workspaces.length === 0) {
  console.error("Usage: node scripts/run-workspace-script.mjs <script> <workspace...>");
  process.exit(1);
}

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("npm_execpath is not set. Run this script through npm.");
  process.exit(1);
}

for (const workspace of workspaces) {
  const result = spawnSync(process.execPath, [npmCli, "run", scriptName, "--workspace", workspace], {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
