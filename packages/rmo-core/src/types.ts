export type ApiResponse<T> = T & { ok: boolean; error?: string };

export interface Flow {
  id: string;
  name: string;
  description?: string;
  created_at?: number;
  updated_at?: number;
  user_id?: string;
  source?: "user" | "published";
}

export interface Robot {
  id: string;
  name: string;
  type?: string;
  status?: string;
  created_at?: number;
}

export interface Job {
  id: string;
  flow_id: string;
  flow_name?: string;
  robot_id: string;
  robot_name?: string;
  status: number;
  started_at?: number;
  finished_at?: number;
}

export interface Schedule {
  id: string;
  name: string;
  flow_id: string;
  robot_id: string;
  cron: string;
  timezone: string;
  type: number;
}

export type JobStatus = "running" | "success" | "failed" | "all";

export const JOB_STATUS_CODE: Record<JobStatus, number> = {
  all: 0,
  running: 1,
  success: 2,
  failed: 3,
};

export interface ListOptions {
  page?: number;
  size?: number;
  search?: string;
}

export interface JobListOptions extends ListOptions {
  status?: JobStatus;
  date?: number;
  flow_id?: string;
}
