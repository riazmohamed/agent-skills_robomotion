export interface SlashCommandInfo {
  name: string; // e.g. "flow list" (no leading /)
  description: string;
  args?: string; // hint shown in menu, e.g. "<flow>"
}

export const SLASH_COMMANDS: SlashCommandInfo[] = [
  { name: "auth login", description: "Save API key + workspace" },
  { name: "auth status", description: "Verify saved API key" },
  { name: "doctor", description: "Diagnose rmo + Robomotion env" },
  { name: "robot list", description: "List all robots" },
  { name: "robot connected", description: "List connected robots" },
  { name: "flow list", description: "List flows" },
  { name: "flow run", description: "Run a flow on a robot", args: "<flow>" },
  { name: "flow stop", description: "Stop the most recent execution", args: "<flow>" },
  { name: "flow open", description: "Print flow repo path", args: "<flow>" },
  { name: "flow push", description: "git commit + push the flow", args: "<flow>" },
  { name: "flow validate", description: "Run pspec validator" },
  { name: "flow test", description: "Run bun test in the flow repo" },
  { name: "run list", description: "List recent jobs" },
  { name: "run describe", description: "Show details for a job_id", args: "<job_id>" },
  { name: "logs", description: "Tail deskbot log" },
  { name: "schedule list", description: "List schedules" },
  { name: "schedule create", description: "Create a schedule" },
  { name: "schedule delete", description: "Delete a schedule", args: "<id>" },
  { name: "help", description: "Show help" },
  { name: "clear", description: "Clear scrollback" },
  { name: "quit", description: "Exit the shell" },
];
