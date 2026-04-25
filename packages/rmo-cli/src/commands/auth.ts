import { Command } from "commander";
import { loadConfig, saveConfig, RobomotionClient } from "@rmo/core";
import { emit, fail, color } from "../output.ts";
import { printBanner, CLI_VERSION } from "../ui/constants/banner.ts";

export const authCmd = new Command("auth").description("Authenticate to a Robomotion workspace");

authCmd
  .command("login")
  .description("Save API key and workspace to ~/.config/rmo/config.json")
  .option("--api-key <key>", "Robomotion API token (Write-scoped). Falls back to ROBOMOTION_API_KEY env.")
  .option("--workspace <url>", "Workspace URL, e.g. myorg.robomotion.io")
  .option("--api-base <url>", "Override API base URL (for on-prem). Default: https://<workspace>/api")
  .action(async (opts: { apiKey?: string; workspace?: string; apiBase?: string }) => {
    const existing = loadConfig();
    const apiKey = opts.apiKey ?? process.env.ROBOMOTION_API_KEY ?? existing.apiKey;
    const workspace = opts.workspace ?? existing.workspace;
    if (!apiKey) fail("--api-key is required (or set ROBOMOTION_API_KEY)");
    if (!workspace) fail("--workspace is required (e.g. myorg.robomotion.io)");
    const cleanWorkspace = workspace.replace(/^https?:\/\//, "").replace(/\/$/, "");
    saveConfig({
      apiKey,
      workspace: cleanWorkspace,
      apiBase: opts.apiBase ?? existing.apiBase,
      defaultRobot: existing.defaultRobot,
    });
    process.stdout.write(color("ok", "✓ saved ~/.config/rmo/config.json (chmod 600)") + "\n");
    try {
      const r = await new RobomotionClient().authCheck();
      process.stdout.write(color("ok", `✓ auth.check ok=${r.ok}`) + "\n");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stdout.write(color("warn", `! auth.check failed: ${msg}`) + "\n");
    }
    printBanner({ version: CLI_VERSION, workspace: cleanWorkspace, authed: true });
  });

authCmd
  .command("status")
  .description("Verify the saved API key against /v1/auth.check")
  .option("--json", "machine-readable output")
  .action(async (opts: { json?: boolean }) => {
    try {
      const r = await new RobomotionClient().authCheck();
      emit({ ...r, workspace: loadConfig().workspace }, opts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fail(msg);
    }
  });
