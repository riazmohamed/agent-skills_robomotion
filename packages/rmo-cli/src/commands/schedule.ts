import { Command } from "commander";
import { RobomotionClient } from "@rmo/core";
import { emit, renderTable, fail } from "../output.ts";
import { fuzzyFind } from "../match.ts";

export const scheduleCmd = new Command("schedule").description("Manage scheduled flow runs");

scheduleCmd
  .command("list")
  .option("--json", "machine-readable")
  .action(async (opts: { json?: boolean }) => {
    try {
      const r = await new RobomotionClient().schedules.list();
      if (opts.json) return emit(r, opts);
      process.stdout.write(
        renderTable(r.schedules.map((s) => ({ id: s.id, name: s.name, cron: s.cron, tz: s.timezone }))) + "\n",
      );
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

scheduleCmd
  .command("create")
  .requiredOption("--name <name>")
  .requiredOption("--flow <name-or-id>")
  .requiredOption("--robot <name-or-id>")
  .requiredOption("--cron <expr>", "e.g. '0 */5 * * *' for every 5 hours")
  .option("--timezone <tz>", "IANA tz, e.g. UTC, America/New_York", "UTC")
  .option("--type <n>", "schedule type code (0..5)", "0")
  .option("--json", "machine-readable")
  .action(async (opts: { name: string; flow: string; robot: string; cron: string; timezone: string; type: string; json?: boolean }) => {
    try {
      const client = new RobomotionClient();
      const flows = await client.flows.listAll({ size: 200 });
      const flow = fuzzyFind(flows.flows, opts.flow).match;
      if (!flow) fail(`flow not found: "${opts.flow}"`);
      const robots = await client.robots.list({ size: 200 });
      const robot = fuzzyFind(robots.robots, opts.robot).match;
      if (!robot) fail(`robot not found: "${opts.robot}"`);
      const r = await client.schedules.create({
        name: opts.name,
        flow_id: flow.id,
        robot_id: robot.id,
        cron: opts.cron,
        timezone: opts.timezone,
        type: parseInt(opts.type, 10),
      });
      emit(r, opts);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

scheduleCmd
  .command("delete <schedule_id>")
  .option("--json", "machine-readable")
  .action(async (id: string, opts: { json?: boolean }) => {
    try {
      const r = await new RobomotionClient().schedules.delete(id);
      emit(r, opts);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });
