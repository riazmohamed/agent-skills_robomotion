#!/usr/bin/env bun
import { Command } from "commander";
import { authCmd } from "./commands/auth.ts";
import { doctorCmd } from "./commands/doctor.ts";
import { robotCmd } from "./commands/robot.ts";
import { flowCmd } from "./commands/flow.ts";
import { runCmd } from "./commands/run.ts";
import { logsCmd } from "./commands/logs.ts";
import { scheduleCmd } from "./commands/schedule.ts";
import { runInteractive } from "./ui/render.tsx";
import { CLI_VERSION } from "./ui/constants/banner.ts";

const program = new Command()
  .name("rmo")
  .description("Drive Robomotion from the terminal — designed for Claude Code")
  .version(CLI_VERSION);

program.addCommand(doctorCmd);
program.addCommand(authCmd);
program.addCommand(robotCmd);
program.addCommand(flowCmd);
program.addCommand(runCmd);
program.addCommand(logsCmd);
program.addCommand(scheduleCmd);

const NO_ARGS = process.argv.length === 2;
const IS_TTY = !!process.stdout.isTTY && !!process.stdin.isTTY;
if (NO_ARGS && IS_TTY) {
  await runInteractive({ version: CLI_VERSION, cwd: process.cwd() });
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}
