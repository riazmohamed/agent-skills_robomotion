export interface OutputOpts {
  json?: boolean;
}

export function emit(data: unknown, opts: OutputOpts = {}): void {
  if (opts.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }
  if (typeof data === "string") {
    process.stdout.write(data + "\n");
    return;
  }
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function table(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "(empty)";
  const cols = Object.keys(rows[0] ?? {});
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const fmt = (vals: string[]) =>
    vals.map((v, i) => v.padEnd(widths[i] ?? v.length)).join("  ");
  const lines = [fmt(cols), fmt(widths.map((w) => "-".repeat(w)))];
  for (const r of rows) lines.push(fmt(cols.map((c) => String(r[c] ?? ""))));
  return lines.join("\n");
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function color(level: "ok" | "fail" | "warn" | "dim", s: string): string {
  if (!process.stdout.isTTY) return s;
  switch (level) {
    case "ok": return `${GREEN}${s}${RESET}`;
    case "fail": return `${RED}${s}${RESET}`;
    case "warn": return `${YELLOW}${s}${RESET}`;
    case "dim": return `${DIM}${s}${RESET}`;
  }
}

export function fail(msg: string, exitCode = 1): never {
  process.stderr.write(color("fail", `error: ${msg}`) + "\n");
  process.exit(exitCode);
}

const BOLD_CYAN = "\x1b[1;36m";
const DIM_GREY = "\x1b[2;90m";

const BOX = {
  h: "─",
  v: "│",
  tl: "┌",
  tr: "┐",
  bl: "└",
  br: "┘",
  t: "┬",
  b: "┴",
  m: "┼",
  ml: "├",
  mr: "┤",
} as const;

/** Render a box-drawing table with ANSI colors when stdout is a TTY and NO_COLOR is not set.
 *  Falls back to plain `table()` for non-TTY or when NO_COLOR is set. */
export function renderTable(rows: Record<string, unknown>[]): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return table(rows);
  }
  if (rows.length === 0) return "(empty)";

  const cols = Object.keys(rows[0] ?? {});
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );

  const pad = (val: string, i: number) => val.padEnd(widths[i] ?? val.length);

  const hLine = (left: string, mid: string, right: string) =>
    left + widths.map((w) => BOX.h.repeat(w)).join(mid) + right;

  const dataLine = (vals: string[]) =>
    BOX.v + vals.map((v, i) => pad(v, i)).join(BOX.v) + BOX.v;

  const lines: string[] = [
    DIM_GREY + hLine(BOX.tl, BOX.t, BOX.tr) + RESET,
    BOLD_CYAN + dataLine(cols) + RESET,
    DIM_GREY + hLine(BOX.ml, BOX.m, BOX.mr) + RESET,
  ];

  for (const r of rows) {
    lines.push(dataLine(cols.map((c) => String(r[c] ?? ""))));
  }

  lines.push(DIM_GREY + hLine(BOX.bl, BOX.b, BOX.br) + RESET);

  return lines.join("\n");
}
