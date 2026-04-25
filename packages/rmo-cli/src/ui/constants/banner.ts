/** "ROBO CLI" wordmark in ANSI Shadow figlet font. 6 lines, 57 chars wide. */
export const LOGO_LINES = [
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557      \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557     \u2588\u2588\u2557",
  "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557    \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2551     \u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2551   \u2588\u2588\u2551    \u2588\u2588\u2551     \u2588\u2588\u2551     \u2588\u2588\u2551",
  "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551    \u2588\u2588\u2551     \u2588\u2588\u2551     \u2588\u2588\u2551",
  "\u2588\u2588\u2551  \u2588\u2588\u2551\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d    \u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551",
  "\u255a\u2550\u255d  \u255a\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u255d  \u255a\u2550\u2550\u2550\u2550\u2550\u255d      \u255a\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d",
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
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/** Convert "#rrggbb" to an ANSI 24-bit foreground escape. */
function truecolor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/** Print a plain-text banner to stdout (no Ink required). Per-row gradient. */
export function printBanner(opts: {
  version: string;
  workspace?: string;
  authed: boolean;
}): void {
  const { version, workspace, authed } = opts;
  // Use only the forward half of the palindrome gradient (cyan → purple).
  const forward = GRADIENT.slice(0, 7);
  const total = LOGO_LINES.length;
  for (let i = 0; i < total; i++) {
    const t = total <= 1 ? 0 : i / (total - 1);
    const idx = Math.min(forward.length - 1, Math.round(t * (forward.length - 1)));
    process.stdout.write(truecolor(forward[idx]!) + LOGO_LINES[i] + RESET + "\n");
  }
  const status = authed ? (workspace ?? "") : "not logged in";
  // Logo wordmark already says "ROBO CLI" — footer is just version + status.
  process.stdout.write(`${truecolor(forward[0]!)}v${version}${RESET}${DIM} \u00b7 ${status}${RESET}\n`);
}
