import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

export interface RmoConfig {
  apiKey?: string;
  workspace?: string;
  apiBase?: string;
  defaultRobot?: string;
}

const CONFIG_PATH = `${process.env.HOME ?? process.env.USERPROFILE ?? "."}/.config/rmo/config.json`;

export function configPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): RmoConfig {
  const fromFile: RmoConfig = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, "utf8"))
    : {};

  return {
    apiKey: process.env.ROBOMOTION_API_KEY ?? fromFile.apiKey,
    workspace: process.env.ROBOMOTION_WORKSPACE ?? fromFile.workspace,
    apiBase: process.env.ROBOMOTION_API_BASE ?? fromFile.apiBase,
    defaultRobot: process.env.ROBOMOTION_ROBOT_ID ?? fromFile.defaultRobot,
  };
}

export function saveConfig(cfg: RmoConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_PATH, 0o600);
}

export function resolveApiBase(cfg: RmoConfig): string {
  if (cfg.apiBase) return cfg.apiBase.replace(/\/$/, "");
  if (!cfg.workspace) throw new Error("Workspace not configured. Run `rmo auth login`.");
  const ws = cfg.workspace.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${ws}/api`;
}

export function requireAuth(cfg: RmoConfig): asserts cfg is RmoConfig & { apiKey: string; workspace: string } {
  if (!cfg.apiKey) throw new Error("Not authenticated. Run `rmo auth login --api-key <token>`.");
  if (!cfg.workspace) throw new Error("Workspace not set. Run `rmo auth login --workspace <url>`.");
}
