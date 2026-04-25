import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

export function isWSL(): boolean {
  if (process.platform !== "linux") return false;
  try {
    const procVersion = readFileSync("/proc/version", "utf8").toLowerCase();
    return procVersion.includes("microsoft") || procVersion.includes("wsl");
  } catch {
    return false;
  }
}

export function detectWindowsHostIP(): string | null {
  if (!isWSL()) return null;
  try {
    const out = execSync("ip route show default", { encoding: "utf8" });
    const match = out.match(/default via (\S+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function windowsUserProfile(): string | null {
  if (!isWSL()) return null;
  try {
    const out = execSync("cmd.exe /c 'echo %USERPROFILE%' 2>/dev/null", { encoding: "utf8" });
    const cleaned = out.trim().replace(/\r$/, "");
    if (!cleaned.startsWith("C:\\")) return null;
    return cleaned.replace(/\\/g, "/").replace(/^C:/i, "/mnt/c");
  } catch {
    return null;
  }
}

export function flowRepoPath(flowId: string): string {
  const candidates: string[] = [];
  if (isWSL()) {
    const winHome = windowsUserProfile();
    if (winHome) {
      candidates.push(`${winHome}/AppData/Local/Robomotion/cache/git/flows/${flowId}`);
      candidates.push(`${winHome}/.config/robomotion/agent/flows/${flowId}`);
    }
  } else if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? `${process.env.USERPROFILE ?? ""}/AppData/Local`;
    candidates.push(`${local}/Robomotion/cache/git/flows/${flowId}`);
    candidates.push(`${process.env.USERPROFILE ?? ""}/.config/robomotion/agent/flows/${flowId}`);
  } else {
    const home = process.env.HOME ?? "";
    candidates.push(`${home}/.config/robomotion/agent/flows/${flowId}`);
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0] ?? "";
}

export function deskbotLogDir(): string {
  if (isWSL()) {
    const winHome = windowsUserProfile();
    if (winHome) return `${winHome}/AppData/Local/Robomotion/logs`;
  }
  if (process.platform === "win32") {
    return `${process.env.LOCALAPPDATA ?? ""}/Robomotion/logs`;
  }
  const home = process.env.HOME ?? "";
  return `${home}/.config/robomotion/logs`;
}

export function localTriggerHost(): string {
  const ip = detectWindowsHostIP();
  return ip ?? "127.0.0.1";
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

export function runEnvironmentChecks(opts: {
  apiKey?: string;
  workspace?: string;
}): DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  checks.push({
    name: "Platform",
    ok: true,
    detail: isWSL() ? "WSL2 (Linux on Windows)" : process.platform,
  });

  if (isWSL()) {
    const ip = detectWindowsHostIP();
    checks.push({
      name: "Windows host IP",
      ok: !!ip,
      detail: ip ?? "could not resolve",
      fix: ip ? undefined : "Run `ip route show default` manually and check WSL2 networking",
    });
    const winHome = windowsUserProfile();
    checks.push({
      name: "Windows %USERPROFILE% mounted",
      ok: !!winHome && existsSync(winHome),
      detail: winHome ?? "not detected",
      fix: winHome ? undefined : "Verify cmd.exe is reachable from WSL",
    });
  }

  checks.push({
    name: "ROBOMOTION_API_KEY",
    ok: !!opts.apiKey,
    detail: opts.apiKey ? `set (${opts.apiKey.length} chars)` : "missing",
    fix: opts.apiKey ? undefined : "Run `rmo auth login --api-key <token> --workspace <url>`",
  });

  checks.push({
    name: "Workspace URL",
    ok: !!opts.workspace,
    detail: opts.workspace ?? "missing",
    fix: opts.workspace ? undefined : "Run `rmo auth login` with --workspace flag",
  });

  try {
    const autocrlf = execSync("git config --global core.autocrlf", { encoding: "utf8" }).trim();
    checks.push({
      name: "git core.autocrlf",
      ok: autocrlf === "input" || autocrlf === "false",
      detail: autocrlf || "(unset)",
      fix: autocrlf === "input" || autocrlf === "false"
        ? undefined
        : "Run `git config --global core.autocrlf input` (avoids line-ending churn on /mnt/c paths)",
    });
  } catch {
    checks.push({
      name: "git core.autocrlf",
      ok: false,
      detail: "git not configured",
      fix: "Install git and run `git config --global core.autocrlf input`",
    });
  }

  return checks;
}
