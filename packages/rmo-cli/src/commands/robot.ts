import { Command } from "commander";
import { RobomotionClient } from "@rmo/core";
import { emit, renderTable, fail } from "../output.ts";

export const robotCmd = new Command("robot").description("Manage robots");

robotCmd
  .command("list")
  .description("List all robots in the workspace")
  .option("--search <q>", "name search")
  .option("--json", "machine-readable")
  .action(async (opts: { search?: string; json?: boolean }) => {
    try {
      const r = await new RobomotionClient().robots.list({ search: opts.search });
      if (opts.json) return emit(r, opts);
      process.stdout.write(renderTable(r.robots.map((rob) => ({ id: rob.id, name: rob.name, type: rob.type ?? "" }))) + "\n");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

robotCmd
  .command("connected")
  .description("List robots currently connected (deskbot running)")
  .option("--json", "machine-readable")
  .action(async (opts: { json?: boolean }) => {
    try {
      const r = await new RobomotionClient().robots.connected();
      if (opts.json) return emit(r, opts);
      if (r.robots.length === 0) {
        process.stderr.write("no robots connected\n");
        process.exit(2);
      }
      process.stdout.write(renderTable(r.robots.map((rob) => ({ id: rob.id, name: rob.name, type: rob.type ?? "" }))) + "\n");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

robotCmd
  .command("create")
  .description("Create a new robot in the workspace")
  .requiredOption("--name <name>", "robot name")
  .option("--type <type>", "robot type (default: development)", "development")
  .option("--json", "machine-readable")
  .action(async (opts: { name: string; type: string; json?: boolean }) => {
    try {
      const r = await new RobomotionClient().robots.create({ name: opts.name, type: opts.type });
      emit(r, opts);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });
