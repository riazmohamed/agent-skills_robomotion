import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "rmo_auth_check",
    description: "Verify the configured Robomotion API key is valid (GET /v1/auth.check).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rmo_environment",
    description:
      "Report the local environment: WSL detection, Windows host IP, Windows %USERPROFILE% mount, workspace, auth status. Call this first when the user asks 'is rmo set up' or after errors that look network-related.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rmo_list_flows",
    description: "List flows in the current workspace (GET /v1/flows.list).",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "name substring filter" },
        page: { type: "number" },
        size: { type: "number" },
      },
    },
  },
  {
    name: "rmo_run_flow",
    description:
      "Run a flow on a connected robot (POST /v1/flows.run). The user must already have a robot connected via deskbot. Use rmo_robots_connected first to verify and pick a robot_id.",
    inputSchema: {
      type: "object",
      properties: {
        flow_id: { type: "string", description: "UUID of the flow" },
        robot_id: { type: "string", description: "UUID of a connected robot" },
        published: {
          type: "boolean",
          description: "use /v1/flows.runPublished instead of run (production)",
        },
      },
      required: ["flow_id", "robot_id"],
    },
  },
  {
    name: "rmo_stop_flow",
    description:
      "Stop a running job (POST /v1/jobs.stop). Get the job_id from rmo_list_jobs with status='running'. Note: /v1/flows.stop is broken in the live API; use this instead.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
      required: ["job_id"],
    },
  },
  {
    name: "rmo_list_robots",
    description: "List all robots in the workspace (GET /v1/robots.list).",
    inputSchema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "rmo_robots_connected",
    description:
      "List robots whose deskbot is currently connected (GET /v1/users.robots.connected.list). Returns empty list if none. Use this before rmo_run_flow.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rmo_create_robot",
    description: "Create a new robot in the workspace (POST /v1/robots.create).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", description: "default: development" },
      },
      required: ["name"],
    },
  },
  {
    name: "rmo_list_jobs",
    description: "List recent job executions (GET /v1/jobs.list).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["running", "success", "failed", "all"] },
        search: { type: "string" },
      },
    },
  },
  {
    name: "rmo_list_schedules",
    description: "List scheduled flow runs (GET /v1/schedules.list).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rmo_create_schedule",
    description: "Create a cron schedule that runs a flow on a robot (POST /v1/schedules.create).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        flow_id: { type: "string" },
        robot_id: { type: "string" },
        cron: { type: "string", description: "5-field cron expression, e.g. '0 9 * * 1-5'" },
        timezone: { type: "string", description: "IANA tz, default UTC" },
        type: { type: "number", description: "schedule type code 0..5; default 0" },
      },
      required: ["name", "flow_id", "robot_id", "cron"],
    },
  },
  {
    name: "rmo_flow_repo_path",
    description:
      "Get the on-disk path to a flow's local git repo (cloned by deskbot). On WSL this resolves to /mnt/c/.../flows/<id>. Use this to know where to read main.ts before editing.",
    inputSchema: {
      type: "object",
      properties: { flow_id: { type: "string" } },
      required: ["flow_id"],
    },
  },
  {
    name: "rmo_push_flow",
    description:
      "git add + commit + rebase + push the local flow repo. Use this after editing main.ts or subflows/*.ts to propagate changes to Robomotion. Avoids the Designer JSON corruption issue.",
    inputSchema: {
      type: "object",
      properties: {
        flow_id: { type: "string" },
        message: { type: "string", description: "commit message; default: 'rmo: update flow'" },
      },
      required: ["flow_id"],
    },
  },
];
