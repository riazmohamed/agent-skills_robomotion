/** Logo rendered with Unicode block characters. 3 lines, ~20 chars wide. */
export const LOGO_LINES = [
  " \u2584\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2584",
  " \u2588       \u2580\u2584\u2580       \u2588",
  " \u2580\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2580",
];

/** Extended gradient with reverse path for smooth animation loop. */
export const GRADIENT = [
  "#22d3ee",
  "#38c5e9",
  "#4eb7e4",
  "#65a9df",
  "#7b9bda",
  "#928dd5",
  "#a87fd0",
  "#928dd5",
  "#7b9bda",
  "#65a9df",
  "#4eb7e4",
  "#38c5e9",
];

/** Package version — kept in sync with package.json. */
export const CLI_VERSION = "0.1.0";

/** ANSI escape helpers for plain-text banner output. */
const CYAN = "\x1b[1;36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/** Print a plain-text banner to stdout (no Ink required). */
export function printBanner(opts: {
  version: string;
  workspace?: string;
  authed: boolean;
}): void {
  const { version, workspace, authed } = opts;
  for (const line of LOGO_LINES) {
    process.stdout.write(CYAN + line + RESET + "\n");
  }
  const status = authed ? (workspace ?? "") : "not logged in";
  process.stdout.write(
    `${CYAN}Robomotion CLI${RESET}${DIM} v${version} \u00b7 ${status}${RESET}\n`,
  );
}
