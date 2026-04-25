import { Command } from "commander";
import { deskbotLogDir } from "@rmo/core";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fail, color } from "../output.ts";

function newestLog(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".log") || f.includes("log"))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? join(dir, files[0].f) : null;
}

export const logsCmd = new Command("logs")
  .description("Tail the local deskbot log file (no remote log API exists)")
  .option("-f, --follow", "follow the log (tail -f)")
  .option("--file <path>", "explicit log file path")
  .action((opts: { follow?: boolean; file?: string }) => {
    const file = opts.file ?? newestLog(deskbotLogDir());
    if (!file) {
      fail(
        `no log file found at ${deskbotLogDir()}. Is deskbot running on Windows?\n` +
          `If so, pass --file <path> manually.`,
      );
    }
    process.stderr.write(color("dim", `→ tailing ${file}\n`));
    const args = opts.follow ? ["-F", file] : [file];
    const cmd = opts.follow ? "tail" : "cat";
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code ?? 0));
  });
