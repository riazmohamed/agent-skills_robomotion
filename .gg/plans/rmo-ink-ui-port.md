# RMO CLI — Ink UI Port (OG Coder style)

## Goal

Replace the messy `_ \ /\ /` ASCII banner of the `rmo` CLI with an **Ink-based interactive TUI** modeled like-for-like on OG Coder's UI: gradient block-character logo, themed footer, slash-command driven shell, formatted tables/spinners — while keeping every existing one-shot command path (`rmo flow run …`, `rmo robot list`, etc.) unchanged for scripts and Claude Code.

## Reference codebases

- Source style: `/home/riaz24/gg-framework/packages/ggcoder/src/ui/`
  - `components/Banner.tsx`, `Footer.tsx`, `Spinner.tsx`, `SelectList.tsx`, `InputArea.tsx`, `SlashCommandMenu.tsx`
  - `theme/` (`theme.ts`, `dark.json`, `light.json`, `detect-theme.ts`)
  - `hooks/useTerminalSize.ts`, `components/AnimationContext.tsx`
  - `constants/figures.ts`, `spinner-frames.ts`, `render.ts`
- Target: `/home/riaz24/projects/robomotion/packages/rmo-cli/`
  - `src/index.ts` — commander entrypoint (no banner today)
  - `src/output.ts` — plain ANSI helpers (`color`, `table`, `emit`, `fail`)
  - `src/commands/{auth,doctor,flow,logs,robot,run,schedule}.ts`
  - Bun workspace (`bun.lock`, `bun run` scripts), `tsconfig.json` extends root (no JSX configured yet)

## UX target (like-for-like, Robomotion-themed)

- **Banner** (top of interactive shell or `rmo` with no args):
  - Block-character "RMO" logo in 3 lines using `▄▀█▀▄` glyphs (mirrors OG Coder's "OG" logo construction in `Banner.tsx` lines 16–20).
  - Per-character horizontal gradient (Robomotion brand: cyan `#22d3ee` → blue `#3b82f6` → indigo `#6366f1`) using the same `GradientText` component pattern.
  - Below logo: `Robomotion CLI · v0.1.0 · drive Robomotion (RPA) from your terminal` plus `cwd` line and shortcut hints (`^F flows  ^R robots  ^J jobs  ^L logs  /help`).
- **Footer** (sticky bottom in interactive mode): workspace · auth status · API base · job count badge · model/colorway sep `│`. Mirrors `Footer.tsx` two-line responsive layout.
- **Slash-command shell** (interactive mode only): `>` prompt (Ink `InputArea`-lite), tab/`/` opens `SlashCommandMenu` listing `/flow`, `/robot`, `/run`, `/logs`, `/schedule`, `/auth`, `/doctor`, `/help`, `/quit`. Each slash command dispatches to the same handlers used by commander. Output is rendered via Ink `<Static>` so completed responses scroll into history while the input area stays pinned.
- **Tables** rendered with theme-colored borders (`│`/`─`/`┼` from `figures.ts`), header row in `theme.primary`, alternating rows dimmed.
- **Spinner** wrapping every async call (`Spinner.tsx` ported verbatim — sparkle frames, stall-aware color).
- **Theme**: dark (default) + light, JSON files copied from OG Coder, recolored to Robomotion brand. Auto-detect via `detect-theme.ts`.

## Scope decisions

- `rmo` (no args) → enters Ink REPL.
- `rmo <subcommand> …` → runs once and exits, but routes output through a **shared formatter** that uses the theme's table/spinner helpers (no React render — plain ANSI) so the look is consistent.
- `--json` and `--no-tty` flags bypass everything (raw JSON / plain text — preserves Claude Code agent contract).
- No agent/LLM features ported — RMO is a control-plane CLI, not a chat agent. No `App.tsx`, `useAgentLoop`, MCP, sessions, plan-mode, or skills overlays.

## Architecture

```
packages/rmo-cli/
├── package.json                 # +ink, react, @types/react; tsx config
├── tsconfig.json                # +jsx: react-jsx
└── src/
    ├── index.ts                 # commander entrypoint — `rmo` w/ no args calls runInteractive()
    ├── output.ts                # KEEP for --json path; add themed table/spinner exports
    ├── match.ts                 # unchanged
    ├── commands/                # unchanged commander handlers (routed to by both modes)
    └── ui/                      # NEW — Ink layer
        ├── render.tsx           # render() entry, ThemeProvider + TerminalSizeProvider + AnimationProvider
        ├── App.tsx              # interactive shell root (Banner + Static history + InputArea + Footer)
        ├── components/
        │   ├── Banner.tsx       # RMO logo + gradient + version/cwd/shortcuts
        │   ├── Footer.tsx       # workspace · auth · api base · jobs
        │   ├── Spinner.tsx      # ported from ggcoder (sparkle frames)
        │   ├── SelectList.tsx   # ported (used by /flow run picker, /robot picker)
        │   ├── SlashCommandMenu.tsx # ported, slimmed for rmo's command set
        │   ├── InputArea.tsx    # MINIMAL port — single-line input, history, `/` opens menu
        │   ├── Table.tsx        # NEW — themed wrapper around output.ts table()
        │   └── StatusLine.tsx   # NEW — `✓`/`✗`/`!` line w/ color
        ├── theme/
        │   ├── theme.ts         # ported
        │   ├── dark.json        # recolored brand
        │   ├── light.json       # recolored brand
        │   └── detect-theme.ts  # ported
        ├── hooks/
        │   └── useTerminalSize.ts  # ported
        ├── constants/
        │   └── figures.ts       # ported
        ├── spinner-frames.ts    # ported
        └── commands/
            └── dispatch.ts      # maps slash command string → existing commander action,
                                 # captures stdout into Ink history items
```

## Theme palette (Robomotion brand)

```jsonc
// dark.json (changes from ggcoder dark.json)
{
  "name": "dark",
  "primary":   "#22d3ee",   // cyan-400 — RMO logo + accents
  "secondary": "#6366f1",   // indigo-500 — model/highlight slot
  "accent":    "#3b82f6",   // blue-500 — gradient mid stop
  "success":   "#4ade80",   // unchanged
  "error":     "#f87171",
  "warning":   "#fbbf24",
  "text":      "#e5e7eb",
  "textDim":   "#6b7280",
  "border":    "#374151",
  "spinnerColor": "#22d3ee"
  // …keep the rest
}
```

Logo gradient stops: `["#22d3ee","#38c5e9","#4eb7e4","#65a9df","#7b9bda","#928dd5","#a87fd0","#928dd5","#7b9bda","#65a9df","#4eb7e4","#38c5e9"]` (forward+reverse for animated loop, same shape as `Banner.tsx`).

## RMO Logo (3 lines, mirrors OG Coder construction)

```
 ▄▀▀▄ ▄▄▄▄▄▄  ▄▀▀▀▄
 █▄▄▀ █ ▀█ █▄▄▄█
 █  █ █  █ █▄▄▄█
```

Built per-character so `GradientText` can color each non-space rune.

## Slash command set

| Slash             | Maps to (commander)             |
|-------------------|---------------------------------|
| `/auth login`     | `authCmd login`                 |
| `/auth status`    | `authCmd status`                |
| `/doctor`         | `doctorCmd`                     |
| `/robot list`     | `robotCmd list`                 |
| `/robot connected`| `robotCmd connected`            |
| `/flow list`      | `flowCmd list`                  |
| `/flow run <q>`   | `flowCmd run` (uses SelectList for ambiguous robots) |
| `/flow stop <q>`  | `flowCmd stop`                  |
| `/flow open <q>`  | `flowCmd open`                  |
| `/flow push <q>`  | `flowCmd push`                  |
| `/flow validate`  | `flowCmd validate`              |
| `/flow test`      | `flowCmd test`                  |
| `/run list`       | `runCmd list`                   |
| `/run describe`   | `runCmd describe`               |
| `/logs`           | `logsCmd`                       |
| `/schedule list/create/delete` | `scheduleCmd …`    |
| `/help`           | local help renderer             |
| `/clear`          | clears Ink `<Static>` history   |
| `/quit`           | `process.exit(0)`               |

## Dependency additions (rmo-cli/package.json)

```jsonc
{
  "dependencies": {
    "@rmo/core": "workspace:*",
    "commander": "^12.1.0",
    "ink": "^6.8.0",
    "react": "^19.2.5"
  },
  "devDependencies": {
    "@types/react": "^19.2.14"
  }
}
```

`tsconfig.json` (rmo-cli local) gains:

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

`bin` entry stays `src/index.ts` — Bun handles `.tsx` natively.

## Risks & mitigations

- **Bun + Ink + React 19**: Ink 6.8 requires React 19; verify Bun 1.x runs `.tsx` without extra config (it does as of Bun 1.1+, but confirm during Step 1 with a smoke test).
- **Build target**: `bun build --target=bun` must include React/Ink. Add `--external` only if the bundle balloons; default behavior bundles fine.
- **Stdout capture for slash commands**: existing handlers `process.stdout.write(...)`. The dispatcher must temporarily redirect `process.stdout.write` to a buffer, then push the captured string as a `<Static>` history item. Restore on completion. (See ggcoder `App.tsx` `CompletedItem` pattern.)
- **`--json` non-interactive path** must continue writing to real stdout untouched — the Ink layer is opt-in (only when `process.stdout.isTTY && argv.length === 2`).
- **Help/--version**: keep commander's behavior; the banner only shows on bare `rmo` invocation.
- **Logo glyph width**: Verify `▄▀█` render at 1 cell wide in common terminals (they do — they're U+25xx Block Elements). Test in Ghostty, iTerm2, Windows Terminal, WSL.

## Verification

1. `bun run packages/rmo-cli/src/index.ts` (no args, TTY) → Ink shell with logo + footer + prompt.
2. `bun run packages/rmo-cli/src/index.ts flow list --json` → identical raw JSON output (no Ink, no banner).
3. `bun run packages/rmo-cli/src/index.ts robot list` → themed table, no Ink REPL.
4. Inside REPL: `/flow list` → spinner → themed table appears in scrollback.
5. `bun run --filter='*' typecheck` → passes.
6. `bun build packages/rmo-cli/src/index.ts --target=bun --outfile=dist/rmo.js` → produces working binary.
7. Resize terminal mid-REPL → no ghost renders.
8. `NO_COLOR=1` → strips colors, layout still readable.

## Steps

1. Add Ink + React deps and JSX config (`packages/rmo-cli/package.json` deps, `packages/rmo-cli/tsconfig.json` `jsx: react-jsx`, `include` += `*.tsx`); `bun install`; smoke-test a one-line `<Text>Hello</Text>` Ink render under Bun.
2. Port theme system (`src/ui/theme/{theme.ts,dark.json,light.json,detect-theme.ts}` from gg-framework) and recolor `dark.json`/`light.json` with Robomotion palette (`primary: #22d3ee`, `secondary: #6366f1`, `accent: #3b82f6`, `spinnerColor: #22d3ee`).
3. Port shared infra: `src/ui/constants/figures.ts`, `src/ui/spinner-frames.ts`, `src/ui/hooks/useTerminalSize.ts`, `src/ui/components/AnimationContext.tsx`, `src/ui/components/Spinner.tsx`, `src/ui/components/SelectList.tsx` — copy verbatim from `/home/riaz24/gg-framework/packages/ggcoder/src/ui/...`, fix import paths to relative.
4. Build `src/ui/components/Banner.tsx` with the 3-line "RMO" block-character logo (use the construction shown in plan section "RMO Logo"), gradient stops from the plan, and a sub-line `Robomotion CLI · v{version} · {workspace ?? "not logged in"} · {cwd}`; render auth/workspace via `loadConfig()` from `@rmo/core`.
5. Build `src/ui/components/Footer.tsx` adapted from gg-framework Footer — drop model/tokens/plan/thinking widgets; show `workspace · auth ✓/✗ · api base · cwd` with the same two-line responsive collapse pattern.
6. Build `src/ui/components/Table.tsx` — themed table renderer using `figures.ts` borders (`│ ─ ┼`), header in `theme.primary`, replacing the plain `output.ts:table()` for TTY; reuse `output.ts:table()` for non-TTY.
7. Build `src/ui/components/StatusLine.tsx` — single-line `✓`/`✗`/`!` status with theme colors (success/error/warning), replaces ad-hoc `color("ok"/"fail"/"warn", …)` calls in commands.
8. Build `src/ui/components/InputArea.tsx` — minimal port: single-line input, `❯ ` prompt, up/down history, Enter submits, `/` triggers SlashCommandMenu, Esc clears. No multiline, no images, no kill ring (drop ~1500 lines of OG Coder InputArea complexity).
9. Build `src/ui/components/SlashCommandMenu.tsx` — port + slim down: filter on input after `/`, render with `SelectList`, command list defined in `src/ui/commands/registry.ts`.
10. Build `src/ui/commands/registry.ts` and `src/ui/commands/dispatch.ts` — registry maps slash-strings to commander action handlers; dispatch captures `process.stdout.write` into a buffer, runs the handler, returns the captured string as a `CompletedItem`.
11. Build `src/ui/App.tsx` — root component: `<Banner />` + Ink `<Static items={history}>` for completed outputs + `<Spinner />` while a command runs + `<InputArea />` + `<Footer />`. Mirrors gg-framework `App.tsx` structure, ~200 lines.
12. Build `src/ui/render.tsx` — Ink `render()` entry wrapping `<ThemeProvider><TerminalSizeProvider><AnimationProvider><App /></AnimationProvider>…`; copy resize-debounce + screen-clear from gg-framework `render.ts`.
13. Wire entry in `src/index.ts` — if `process.argv.length === 2 && process.stdout.isTTY` call `runInteractive()` from `./ui/render.tsx`; otherwise existing commander `parseAsync` path runs unchanged.
14. Update existing command outputs: in `src/commands/*.ts` replace direct `table()` calls with conditional `isTTY && !json ? renderThemedTable(rows) : table(rows)` (themed table prints ANSI-only, no Ink, so non-interactive `rmo flow list` still gets the new look).
15. Verify: run `bun run packages/rmo-cli/src/index.ts` (REPL), `… flow list --json` (raw JSON), `… robot list` (themed table no REPL), `… --help` (commander default); resize terminal during REPL; run `bun run --filter='*' typecheck` and `bun build packages/rmo-cli/src/index.ts --target=bun --outfile=dist/rmo.js`.
