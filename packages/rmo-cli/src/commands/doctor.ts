import { Command } from "commander";
import { loadConfig, runEnvironmentChecks, isWSL, detectWindowsHostIP, flowRepoPath } from "@rmo/core";
import { existsSync } from "node:fs";
import { color } from "../output.ts";

export const doctorCmd = new Command("doctor")
  .description("Diagnose the rmo + Robomotion environment")
  .option("--flow <id>", "also verify the flow repo path for this flow_id is mounted")
  .action((opts: { flow?: string }) => {
    const cfg = loadConfig();
    const checks = runEnvironmentChecks({ apiKey: cfg.apiKey, workspace: cfg.workspace });

    if (opts.flow) {
      const path = flowRepoPath(opts.flow);
      checks.push({
        name: `flow repo path (${opts.flow})`,
        ok: existsSync(path),
        detail: path,
        fix: existsSync(path) ? undefined : `Connect deskbot on Windows so the repo clones; expected at ${path}`,
      });
    }

    let allOk = true;
    for (const c of checks) {
      const mark = c.ok ? color("ok", "✓") : color("fail", "✗");
      process.stdout.write(`${mark} ${c.name.padEnd(34)} ${color("dim", c.detail)}\n`);
      if (!c.ok && c.fix) {
        process.stdout.write(`    ${color("warn", "→ " + c.fix)}\n`);
        allOk = false;
      }
    }

    if (isWSL()) {
      const ip = detectWindowsHostIP();
      if (ip) {
        process.stdout.write(`\n${color("dim", `Note: local HTTP In trigger reachable at http://${ip}:9090/<endpoint> from WSL`)}\n`);
      }
    }

    if (!allOk) process.exit(1);
  });
