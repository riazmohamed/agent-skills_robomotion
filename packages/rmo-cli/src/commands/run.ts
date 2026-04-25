import { Command } from "commander";
import { RobomotionClient, type JobStatus } from "@rmo/core";
import { emit, renderTable, fail } from "../output.ts";
import { fuzzyFind, describeMatch } from "../match.ts";

const STATUS_NAME: Record<number, string> = { 1: "running", 2: "success", 3: "failed" };

export const runCmd = new Command("run").description("Inspect job/run history");

runCmd
  .command("list")
  .description("List jobs (executions) in the workspace")
  .option("--flow <name-or-id>", "filter by flow")
  .option("--status <s>", "running | success | failed | all", "all")
  .option("--json", "machine-readable")
  .action(async (opts: { flow?: string; status: string; json?: boolean }) => {
    try {
      const client = new RobomotionClient();
      const status = (["running", "success", "failed", "all"] as JobStatus[]).includes(opts.status as JobStatus)
        ? (opts.status as JobStatus)
        : "all";
      const r = await client.jobs.list({ status });
      let jobs = r.jobs;
      if (opts.flow) {
        const flows = await client.flows.listAll({ size: 200 });
        const { match, ambiguous } = fuzzyFind(flows.flows, opts.flow);
        if (!match) {
          if (ambiguous.length > 1) fail(`flow "${opts.flow}" matched ${ambiguous.length}:\n${describeMatch(ambiguous)}`);
          fail(`flow not found: "${opts.flow}"`);
        }
        jobs = jobs.filter((j) => j.flow_id === match.id);
      }
      if (opts.json) return emit({ ...r, jobs }, opts);
      process.stdout.write(
        renderTable(
          jobs.map((j) => ({
            id: j.id,
            flow: j.flow_name ?? j.flow_id,
            robot: j.robot_name ?? j.robot_id,
            status: STATUS_NAME[j.status] ?? String(j.status),
          })),
        ) + "\n",
      );
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

runCmd
  .command("describe <job_id>")
  .description("Show details for a single job")
  .option("--json", "machine-readable")
  .action(async (jobId: string, opts: { json?: boolean }) => {
    try {
      const r = await new RobomotionClient().jobs.list({});
      const job = r.jobs.find((j) => j.id === jobId);
      if (!job) fail(`job not found in recent listing: ${jobId}`);
      emit(job, opts);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });
