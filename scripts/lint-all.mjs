import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const commands = [
  {
    label: "client lint",
    cwd: path.join(root, "client"),
    args: [path.join(root, "node_modules/eslint/bin/eslint.js"), "."]
  },
  {
    label: "server typecheck",
    cwd: root,
    args: ["node_modules/typescript/bin/tsc", "-p", "server/tsconfig.json", "--noEmit"]
  }
];

for (const command of commands) {
  const result = spawnSync(process.execPath, command.args, {
    cwd: command.cwd,
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    console.error(`${command.label} failed`);
    process.exit(result.status ?? 1);
  }
}
