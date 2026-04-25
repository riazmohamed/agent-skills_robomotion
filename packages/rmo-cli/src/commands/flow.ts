import { Command } from "commander";
import { RobomotionClient, flowRepoPath, loadConfig, requireAuth, type Flow, type Robot } from "@rmo/core";
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { emit, renderTable, fail, color } from "../output.ts";
import { fuzzyFind, describeMatch } from "../match.ts";

async function resolveFlow(client: RobomotionClient, query: string): Promise<Flow> {
  const r = await client.flows.listAll({ size: 200 });
  const { match, ambiguous } = fuzzyFind(r.flows, query);
  if (match) return match;
  if (ambiguous.length > 1) {
    fail(`flow query "${query}" matched ${ambiguous.length} flows:\n${describeMatch(ambiguous)}`);
  }
  // Fall back to job history (covers flows owned by other users in the workspace).
  const fromJobs = await client.flows.listFromJobs().catch(() => ({ flows: [] as Flow[] }));
  const fromJobsMatch = fuzzyFind(fromJobs.flows, query);
  if (fromJobsMatch.match) return fromJobsMatch.match;
  // If the query is a bare UUID, accept it as-is — flows.run only needs the id.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
    return { id: query, name: query };
  }
  fail(
    `flow not found: "${query}". /v1/flows.list is user-scoped — flows owned by other accounts are invisible.\n` +
      `Workarounds: pass the flow UUID directly, or check 'rmo run list' for flow_id values from job history.`,
  );
}

async function pickRobot(client: RobomotionClient, hint?: string): Promise<Robot> {
  const connected = await client.robots.connected();
  if (connected.robots.length === 0) fail("no robots connected. Run `rmo robot connected`.");
  if (hint) {
    const { match, ambiguous } = fuzzyFind(connected.robots, hint);
    if (match) return match;
    if (ambiguous.length > 1) fail(`robot hint "${hint}" matched ${ambiguous.length}:\n${describeMatch(ambiguous)}`);
    fail(`robot not connected: "${hint}"`);
  }
  if (connected.robots.length === 1) return connected.robots[0]!;
  fail(
    `${connected.robots.length} robots connected — pass --robot <name>:\n${describeMatch(connected.robots)}`,
  );
}

export const flowCmd = new Command("flow").description("Work with Robomotion flows");

flowCmd
  .command("list")
  .description("List flows visible to the API key. Falls back to job history if /v1/flows.list is empty.")
  .option("--search <q>", "name substring filter")
  .option("--source <s>", "user | published | all | history", "all")
  .option("--json", "machine-readable")
  .action(async (opts: { search?: string; source: string; json?: boolean }) => {
    try {
      const c = new RobomotionClient();
      let r: { flows: Flow[]; total: number };
      if (opts.source === "user") {
        const u = await c.flows.list({ search: opts.search });
        r = { flows: u.flows.map((f) => ({ ...f, source: "user" })), total: u.total };
      } else if (opts.source === "published") {
        const p = await c.flows.listPublished({ search: opts.search });
        r = { flows: p.flows.map((f) => ({ ...f, source: "published" })), total: p.total };
      } else if (opts.source === "history") {
        r = await c.flows.listFromJobs();
      } else {
        r = await c.flows.listAll({ search: opts.search });
        if (r.flows.length === 0) {
          const fromJobs = await c.flows.listFromJobs().catch(() => ({ flows: [], total: 0 }));
          if (fromJobs.flows.length > 0) {
            process.stderr.write(
              "note: flows.list returned 0 — falling back to job history (flows owned by other workspace users)\n",
            );
            r = fromJobs;
          }
        }
      }
      if (opts.json) return emit(r, opts);
      process.stdout.write(
        renderTable(r.flows.map((f) => ({ id: f.id, name: f.name, source: f.source ?? "" }))) + "\n",
      );
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

flowCmd
  .command("run <flow>")
  .description("Run a flow on a connected robot. Auto-picks the robot if exactly one is connected.")
  .option("--robot <name-or-id>", "force a specific connected robot")
  .option("--published", "use /v1/flows.runPublished instead of run")
  .option("--json", "machine-readable")
  .action(async (query: string, opts: { robot?: string; published?: boolean; json?: boolean }) => {
    try {
      const client = new RobomotionClient();
      const flow = await resolveFlow(client, query);
      const robot = await pickRobot(client, opts.robot);
      const fn = opts.published ? client.flows.runPublished : client.flows.run;
      const r = await fn.call(client.flows, flow.id, robot.id);
      if (opts.json) return emit({ flow, robot, response: r }, opts);
      process.stdout.write(
        color("ok", `▶ running ${flow.name} on ${robot.name}`) +
          ` ${color("dim", `(flow=${flow.id} robot=${robot.id})`)}\n`,
      );
      if (r.job_id) process.stdout.write(`job_id: ${r.job_id}\n`);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

flowCmd
  .command("stop <flow>")
  .description("Stop the most recent running execution of <flow> (uses /v1/jobs.stop)")
  .option("--job <job_id>", "stop a specific job_id instead of the most recent running one")
  .option("--json", "machine-readable")
  .action(async (query: string, opts: { job?: string; json?: boolean }) => {
    try {
      const client = new RobomotionClient();
      let jobId = opts.job;
      if (!jobId) {
        const flow = await resolveFlow(client, query);
        const jobs = await client.jobs.list({ status: "running" });
        const candidate = jobs.jobs.find((j) => j.flow_id === flow.id);
        if (!candidate) fail(`no running job found for flow "${flow.name}"`);
        jobId = candidate.id;
      }
      const r = await client.jobs.stop(jobId);
      if (opts.json) return emit({ job_id: jobId, ...r }, opts);
      process.stdout.write(color("ok", `✓ stopped job ${jobId}`) + "\n");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

flowCmd
  .command("open <flow>")
  .description("Print the flow repo path on disk for editing main.ts/subflows/*.ts")
  .option("--json", "machine-readable")
  .action(async (query: string, opts: { json?: boolean }) => {
    try {
      const flow = await resolveFlow(new RobomotionClient(), query);
      const path = flowRepoPath(flow.id);
      if (opts.json) return emit({ flow, path, exists: existsSync(path) }, opts);
      process.stdout.write(path + "\n");
      if (!existsSync(path)) {
        process.stderr.write(
          color("warn", `! repo not yet cloned. Connect deskbot to robot, then re-run.`) + "\n",
        );
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

flowCmd
  .command("push <flow>")
  .description("git add source files, commit, rebase origin/main, push (with Basic auth via API key)")
  .option("-m, --message <msg>", "commit message", "rmo: update flow")
  .option("--all", "git add everything in the repo (default: only main.{js,ts} + subflows/)")
  .option(
    "--keep-generated",
    "do NOT discard deskbot-managed files (main.designer.{js,ts}, main.model.{js,ts}, main.version.{js,ts}, .generated/) before rebasing. Default is to discard them since deskbot regenerates them.",
  )
  .action(async (query: string, opts: { message: string; all?: boolean; keepGenerated?: boolean }) => {
    try {
      const cfg = loadConfig();
      requireAuth(cfg);
      const flow = await resolveFlow(new RobomotionClient(cfg), query);
      const path = flowRepoPath(flow.id);
      if (!existsSync(path)) fail(`flow repo not on disk: ${path}`);

      const basic = Buffer.from(`x:${cfg.apiKey}`).toString("base64");
      const authArg = `-c 'http.extraHeader=Authorization: Basic ${basic}'`;

      const sh = (cmd: string, label?: string) => {
        process.stdout.write(color("dim", `$ ${label ?? cmd}`) + "\n");
        execSync(cmd, { cwd: path, stdio: "inherit" });
      };
      const shGit = (args: string, label: string) => sh(`git ${authArg} ${args}`, `git ${label}`);

      if (!opts.keepGenerated) {
        sh(
          "git checkout -- main.designer.js main.designer.ts main.model.js main.model.ts main.version.js main.version.ts 2>/dev/null; rm -rf .generated 2>/dev/null; true",
          "discard generated files",
        );
      }

      const addCmd = opts.all
        ? "git add -A"
        : "git add main.js main.ts subflows/ 2>/dev/null; git add main.js 2>/dev/null || git add main.ts 2>/dev/null || true";
      sh(addCmd);

      try {
        execSync("git diff --cached --quiet", { cwd: path });
        process.stdout.write(color("warn", "no staged changes; skipping commit") + "\n");
      } catch {
        sh(`git commit -m ${JSON.stringify(opts.message)}`);
      }

      shGit("fetch origin", "fetch origin");
      // Check if local is ahead of origin/main with no divergence (clean fast-forward).
      let needsRebase = true;
      try {
        const headSha = execSync("git rev-parse HEAD", { cwd: path, encoding: "utf8" }).trim();
        const mergeBase = execSync("git merge-base HEAD origin/main", { cwd: path, encoding: "utf8" }).trim();
        const originSha = execSync("git rev-parse origin/main", { cwd: path, encoding: "utf8" }).trim();
        if (mergeBase === originSha && headSha !== originSha) {
          needsRebase = false;
          process.stdout.write(color("dim", "(local is fast-forward of origin/main; skipping rebase)") + "\n");
        }
      } catch { /* fall through to rebase */ }
      if (needsRebase) {
        // Stash deskbot's working-tree noise, rebase, then drop the stash (deskbot regenerates).
        try { execSync("git stash --include-untracked --quiet", { cwd: path }); } catch { /* nothing to stash */ }
        try {
          shGit("rebase origin/main", "rebase origin/main");
        } finally {
          try { execSync("git stash drop --quiet", { cwd: path }); } catch { /* no stash entry */ }
        }
      }
      shGit("push origin HEAD:main", "push origin HEAD:main");
      process.stdout.write(color("ok", `✓ pushed ${flow.name} — open Designer to verify`) + "\n");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  });

flowCmd
  .command("validate")
  .description("Run the pspec validator (delegates to validating-flow skill's validator)")
  .option("--flow <name-or-id>", "validate a specific flow's repo (default: cwd)")
  .action(async (opts: { flow?: string }) => {
    let cwd = process.cwd();
    if (opts.flow) {
      const flow = await resolveFlow(new RobomotionClient(), opts.flow);
      cwd = flowRepoPath(flow.id);
    }
    const r = spawnSync("robomotion", ["validate"], { cwd, stdio: "inherit" });
    if (r.status !== 0) fail(`validate failed (exit ${r.status})`, r.status ?? 1);
  });

flowCmd
  .command("test")
  .description("Run bun test against the flow repo (delegates to testing-flow skill's harness)")
  .option("--flow <name-or-id>", "test a specific flow's repo (default: cwd)")
  .action(async (opts: { flow?: string }) => {
    let cwd = process.cwd();
    if (opts.flow) {
      const flow = await resolveFlow(new RobomotionClient(), opts.flow);
      cwd = flowRepoPath(flow.id);
    }
    const r = spawnSync("bun", ["test"], { cwd, stdio: "inherit" });
    if (r.status !== 0) fail(`bun test failed (exit ${r.status})`, r.status ?? 1);
  });
