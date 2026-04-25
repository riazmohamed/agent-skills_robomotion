import { Command, CommanderError } from "commander";
import { authCmd } from "../../commands/auth.ts";
import { doctorCmd } from "../../commands/doctor.ts";
import { robotCmd } from "../../commands/robot.ts";
import { flowCmd } from "../../commands/flow.ts";
import { runCmd } from "../../commands/run.ts";
import { logsCmd } from "../../commands/logs.ts";
import { scheduleCmd } from "../../commands/schedule.ts";
import { SLASH_COMMANDS } from "./registry.ts";

export interface DispatchResult {
  ok: boolean;
  output: string; // captured stdout + stderr (ANSI preserved)
  durationMs: number;
}

function buildHelp(): string {
  const lines = ["Available commands:", ""];
  for (const cmd of SLASH_COMMANDS) {
    const name = `/${cmd.name}`;
    const args = cmd.args ? ` ${cmd.args}` : "";
    lines.push(`  ${name.padEnd(22)}${args.padEnd(12)} ${cmd.description}`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function dispatchSlash(input: string): Promise<DispatchResult> {
  const start = performance.now();

  const trimmed = input.trim();
  const withoutSlash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const argv = withoutSlash.split(/\s+/).filter(Boolean);
  const cmdName = argv[0] ?? "";

  if (cmdName === "quit") {
    process.exit(0);
  }

  if (cmdName === "clear") {
    return { ok: true, output: "__CLEAR__", durationMs: 0 };
  }

  if (cmdName === "help") {
    return { ok: true, output: buildHelp(), durationMs: 0 };
  }

  const chunks: string[] = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  const origExit = process.exit.bind(process);

  process.stdout.write = (chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean => {
    const s = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(typeof encoding === "string" ? encoding : "utf8");
    chunks.push(s);
    if (typeof cb === "function") cb(null);
    return true;
  };

  process.stderr.write = (chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean => {
    const s = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(typeof encoding === "string" ? encoding : "utf8");
    chunks.push(s);
    if (typeof cb === "function") cb(null);
    return true;
  };

  process.exit = (code?: number | string | null | undefined): never => {
    throw new Error(`exit ${String(code ?? 0)}`);
  };

  let ok = true;

  try {
    const program = new Command().name("rmo").exitOverride();
    program.addCommand(doctorCmd);
    program.addCommand(authCmd);
    program.addCommand(robotCmd);
    program.addCommand(flowCmd);
    program.addCommand(runCmd);
    program.addCommand(logsCmd);
    program.addCommand(scheduleCmd);
    await program.parseAsync(["node", "rmo", ...argv]);
  } catch (err) {
    ok = false;
    if (err instanceof CommanderError) {
      chunks.push(err.message + "\n");
    } else if (err instanceof Error) {
      const msg = err.message;
      if (msg.startsWith("exit ")) {
        const code = msg.slice(5);
        if (code !== "0") {
          chunks.push(`error: exit ${code}\n`);
        } else {
          ok = true;
        }
      } else {
        chunks.push(`error: ${msg}\n`);
      }
    } else {
      chunks.push(`error: ${String(err)}\n`);
    }
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    process.exit = origExit;
  }

  const durationMs = performance.now() - start;
  return { ok, output: chunks.join(""), durationMs };
}
