#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  RobomotionClient,
  flowRepoPath,
  isWSL,
  detectWindowsHostIP,
  windowsUserProfile,
  loadConfig,
  type JobStatus,
} from "@rmo/core";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tools } from "./tools.ts";

const server = new Server(
  { name: "rmo-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, string | number | boolean | undefined>;

  const respond = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  });
  const fail = (msg: string) => ({
    isError: true,
    content: [{ type: "text" as const, text: msg }],
  });

  try {
    switch (name) {
      case "rmo_auth_check":
        return respond(await new RobomotionClient().authCheck());

      case "rmo_list_flows":
        return respond(
          await new RobomotionClient().flows.list({
            search: a.search as string | undefined,
            page: a.page as number | undefined,
            size: a.size as number | undefined,
          }),
        );

      case "rmo_run_flow": {
        if (!a.flow_id || !a.robot_id) return fail("flow_id and robot_id are required");
        const c = new RobomotionClient();
        const fn = a.published ? c.flows.runPublished : c.flows.run;
        return respond(await fn.call(c.flows, a.flow_id as string, a.robot_id as string));
      }

      case "rmo_stop_flow":
        if (!a.job_id) return fail("job_id is required (use rmo_list_jobs status=running to find it)");
        return respond(await new RobomotionClient().jobs.stop(a.job_id as string));

      case "rmo_list_robots":
        return respond(
          await new RobomotionClient().robots.list({
            search: a.search as string | undefined,
          }),
        );

      case "rmo_robots_connected":
        return respond(await new RobomotionClient().robots.connected());

      case "rmo_create_robot":
        if (!a.name) return fail("name is required");
        return respond(
          await new RobomotionClient().robots.create({
            name: a.name as string,
            type: (a.type as string) ?? "development",
          }),
        );

      case "rmo_list_jobs":
        return respond(
          await new RobomotionClient().jobs.list({
            status: (a.status as JobStatus) ?? "all",
            search: a.search as string | undefined,
          }),
        );

      case "rmo_list_schedules":
        return respond(await new RobomotionClient().schedules.list());

      case "rmo_create_schedule": {
        if (!a.name || !a.flow_id || !a.robot_id || !a.cron) {
          return fail("name, flow_id, robot_id, cron required");
        }
        return respond(
          await new RobomotionClient().schedules.create({
            name: a.name as string,
            flow_id: a.flow_id as string,
            robot_id: a.robot_id as string,
            cron: a.cron as string,
            timezone: (a.timezone as string) ?? "UTC",
            type: (a.type as number) ?? 0,
          }),
        );
      }

      case "rmo_flow_repo_path": {
        if (!a.flow_id) return fail("flow_id is required");
        const path = flowRepoPath(a.flow_id as string);
        return respond({ flow_id: a.flow_id, path, exists: existsSync(path) });
      }

      case "rmo_push_flow": {
        if (!a.flow_id) return fail("flow_id is required");
        const path = flowRepoPath(a.flow_id as string);
        if (!existsSync(path)) return fail(`flow repo not on disk: ${path}`);
        const cfg = loadConfig();
        if (!cfg.apiKey) return fail("not authenticated; run rmo auth login first");
        const message = (a.message as string) ?? "rmo: update flow";
        const basic = Buffer.from(`x:${cfg.apiKey}`).toString("base64");
        const auth = `-c 'http.extraHeader=Authorization: Basic ${basic}'`;
        const log: string[] = [];
        const sh = (cmd: string) => {
          const out = execSync(cmd, { cwd: path, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
          log.push(`$ ${cmd}\n${out}`);
        };
        try {
          sh("git checkout -- main.designer.js main.designer.ts main.model.js main.model.ts main.version.js main.version.ts 2>/dev/null; rm -rf .generated 2>/dev/null; true");
          sh("git add main.js main.ts subflows/ 2>/dev/null; git add main.js 2>/dev/null || git add main.ts 2>/dev/null || true");
          try {
            execSync("git diff --cached --quiet", { cwd: path });
            log.push("(no staged changes)");
          } catch {
            sh(`git commit -m ${JSON.stringify(message)}`);
          }
          sh(`git ${auth} fetch origin`);
          let needsRebase = true;
          try {
            const headSha = execSync("git rev-parse HEAD", { cwd: path, encoding: "utf8" }).trim();
            const mergeBase = execSync("git merge-base HEAD origin/main", { cwd: path, encoding: "utf8" }).trim();
            const originSha = execSync("git rev-parse origin/main", { cwd: path, encoding: "utf8" }).trim();
            if (mergeBase === originSha && headSha !== originSha) needsRebase = false;
          } catch { /* fall through */ }
          if (needsRebase) {
            try { execSync("git stash --include-untracked --quiet", { cwd: path }); } catch {}
            try { sh(`git ${auth} rebase origin/main`); }
            finally { try { execSync("git stash drop --quiet", { cwd: path }); } catch {} }
          }
          sh(`git ${auth} push origin HEAD:main`);
          return respond({ ok: true, log: log.join("\n---\n") });
        } catch (e) {
          return fail(
            `git push failed: ${e instanceof Error ? e.message : String(e)}\n${log.join("\n---\n")}`,
          );
        }
      }

      case "rmo_environment": {
        const cfg = loadConfig();
        return respond({
          wsl: isWSL(),
          windows_host_ip: detectWindowsHostIP(),
          windows_userprofile: windowsUserProfile(),
          workspace: cfg.workspace,
          api_base: cfg.apiBase,
          authenticated: !!cfg.apiKey,
        });
      }

      default:
        return fail(`unknown tool: ${name}`);
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
