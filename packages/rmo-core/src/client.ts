import type {
  ApiResponse,
  Flow,
  Robot,
  Job,
  Schedule,
  ListOptions,
  JobListOptions,
} from "./types.ts";
import { JOB_STATUS_CODE } from "./types.ts";
import { loadConfig, resolveApiBase, requireAuth, type RmoConfig } from "./config.ts";

export class RobomotionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "RobomotionApiError";
  }
}

export class RobomotionClient {
  private readonly base: string;
  private readonly apiKey: string;

  constructor(cfg: RmoConfig = loadConfig()) {
    requireAuth(cfg);
    this.apiKey = cfg.apiKey;
    this.base = resolveApiBase(cfg);
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.base}${path}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new RobomotionApiError(`Non-JSON response from ${url.pathname}`, res.status, text);
    }
    if (!res.ok) {
      const body = json as { error?: string };
      throw new RobomotionApiError(body.error ?? `HTTP ${res.status}`, res.status, json);
    }
    const apiBody = json as { ok?: boolean; error?: string };
    if (apiBody.ok === false) {
      throw new RobomotionApiError(apiBody.error ?? "API returned ok=false", res.status, json);
    }
    return json as ApiResponse<T>;
  }

  authCheck(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request("/v1/auth.check");
  }

  flows = {
    list: (opts: ListOptions = {}) =>
      this.request<{ flows: Flow[]; total: number }>("/v1/flows.list", { query: opts as Record<string, string | number | undefined> }),

    listPublished: (opts: ListOptions = {}) =>
      this.request<{ flows: Flow[]; total: number }>("/v1/flows.listPublished", { query: opts as Record<string, string | number | undefined> }),

    listAll: async (opts: ListOptions = {}) => {
      const userP = this.request<{ flows: Flow[]; total: number }>("/v1/flows.list", { query: opts as Record<string, string | number | undefined> })
        .then((r) => r.flows.map((f) => ({ ...f, source: "user" as const })))
        .catch(() => [] as Flow[]);
      const pubP = this.request<{ flows: Flow[]; total: number }>("/v1/flows.listPublished", { query: opts as Record<string, string | number | undefined> })
        .then((r) => r.flows.map((f) => ({ ...f, source: "published" as const })))
        .catch(() => [] as Flow[]);
      const [user, pub] = await Promise.all([userP, pubP]);
      const seen = new Set<string>();
      const flows = [...user, ...pub].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
      return { ok: true, flows, total: flows.length };
    },

    listFromJobs: async () => {
      const r = await this.request<{ jobs: Array<{ flow_id: string; flow_name?: string }>; total: number }>("/v1/jobs.list", { query: { size: 200 } });
      const seen = new Map<string, Flow>();
      for (const j of r.jobs) {
        if (!seen.has(j.flow_id)) {
          seen.set(j.flow_id, { id: j.flow_id, name: j.flow_name ?? j.flow_id, source: "user" });
        }
      }
      const flows = [...seen.values()];
      return { ok: true, flows, total: flows.length };
    },

    run: (flowId: string, robotId: string) =>
      this.request<{ job_id?: string }>("/v1/flows.run", {
        method: "POST",
        body: { flow_id: flowId, robot_id: robotId },
      }),

    runPublished: (flowId: string, robotId: string) =>
      this.request<{ job_id?: string }>("/v1/flows.runPublished", {
        method: "POST",
        body: { flow_id: flowId, robot_id: robotId },
      }),

    stop: (robotId: string) =>
      this.request<Record<string, unknown>>("/v1/flows.stop", {
        method: "POST",
        body: { robot_id: robotId },
      }),

    delete: (flowId: string) =>
      this.request<Record<string, unknown>>("/v1/flows.delete", {
        method: "DELETE",
        body: { flow_id: flowId },
      }),
  };

  robots = {
    list: (opts: ListOptions = {}) =>
      this.request<{ robots: Robot[]; total: number }>("/v1/robots.list", { query: opts as Record<string, string | number | undefined> }),

    create: (input: { name: string; type: string }) =>
      this.request<{ robot: Robot }>("/v1/robots.create", { method: "POST", body: input }),

    update: (input: { robot_id: string; name: string }) =>
      this.request<{ robot: Robot }>("/v1/robots.update", { method: "POST", body: input }),

    stop: (input: { robot_id: string; studio_id?: string }) =>
      this.request<Record<string, unknown>>("/v1/robots.stop", { method: "POST", body: input }),

    delete: (robotId: string) =>
      this.request<Record<string, unknown>>("/v1/robots.delete", {
        method: "DELETE",
        body: { robot_id: robotId },
      }),

    connected: () =>
      this.request<{ robots: Robot[]; total: number }>("/v1/users.robots.connected.list"),
  };

  jobs = {
    list: (opts: JobListOptions = {}) => {
      const query: Record<string, string | number | undefined> = {
        page: opts.page,
        size: opts.size,
        search: opts.search,
        date: opts.date,
      };
      if (opts.status) query.status = JOB_STATUS_CODE[opts.status];
      return this.request<{ jobs: Job[]; total: number }>("/v1/jobs.list", { query });
    },

    stop: (jobId: string) =>
      this.request<Record<string, unknown>>("/v1/jobs.stop", {
        method: "POST",
        body: { job_id: jobId },
      }),
  };

  schedules = {
    list: (opts: ListOptions = {}) =>
      this.request<{ schedules: Schedule[]; total: number }>("/v1/schedules.list", { query: opts as Record<string, string | number | undefined> }),

    create: (input: {
      name: string;
      flow_id: string;
      robot_id: string;
      timezone: string;
      type: number;
      cron: string;
    }) =>
      this.request<{ schedule: Schedule }>("/v1/schedules.create", { method: "POST", body: input }),

    delete: (scheduleId: string) =>
      this.request<Record<string, unknown>>("/v1/schedules.delete", {
        method: "DELETE",
        body: { schedule_id: scheduleId },
      }),
  };
}
