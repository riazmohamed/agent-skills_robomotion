---
name: connecting-robot
description: Bootstrap and run Robomotion from the terminal via the rmo CLI / rmo-mcp tools. Covers WSL2+Windows topology, robot connect, the "check connected → run flow" loop, the git-push workflow that bypasses Designer JSON corruption, and the AES key alignment rule.
allowed-tools: rmo_environment rmo_auth_check rmo_robots_connected rmo_list_flows rmo_run_flow rmo_stop_flow rmo_list_jobs rmo_flow_repo_path rmo_push_flow
---

# connecting-robot

Use this skill when the user wants to **trigger, monitor, or edit Robomotion flows from the terminal** rather than the Designer UI.

## Mental model

There are two registries you cannot bypass today:
1. **Robomotion Designer** — the *only* place a new flow can be created (no `POST /v1/flows.create` exists). The user creates an empty shell flow there once.
2. **Robomotion Admin → Robots** — the *only* place a robot record is created. The user creates one robot there once, then runs `robomotion-deskbot` on Windows to make it "connected."

After those two manual steps, every subsequent iteration is rmo-driven:
- read `main.ts` from the local flow repo, edit it, `rmo_push_flow` → robot pulls.
- `rmo_robots_connected` to gate, then `rmo_run_flow`.
- `rmo_list_jobs` to inspect outcomes.

## The "check robots → run" loop (most common request)

When the user says *"run flow X"* or *"trigger the foo flow"*:

1. Call `rmo_robots_connected`. If empty → tell user to start their deskbot (see `docs/platforms.md`); do not proceed.
2. Call `rmo_list_flows` with `search` set to a substring of what the user said. If 0 matches, fail loudly. If >1, ask the user to disambiguate.
3. Pick the robot:
   - exactly one connected → use it.
   - more than one → ask the user.
4. Call `rmo_run_flow` with `flow_id` + `robot_id`.
5. Call `rmo_list_jobs` with `status: "running"` to confirm the run started.
6. Tail the deskbot log for output (use the `logs` Bash tool, no remote log API exists).

## The git-push edit loop

When the user says *"add a step that does X"* or *"edit the foo flow"*:

1. Call `rmo_flow_repo_path` for the flow's id. If `exists: false`, instruct the user to ensure deskbot is connected (it clones repos on connect).
2. Read `main.ts` and any `subflows/*.ts` in that path.
3. Apply minimal edits (defer to the `creating-flow` skill for SDK grammar — do not duplicate that knowledge here).
4. Run `rmo_push_flow` with a one-line commit message describing the change.
5. The robot picks up the new version on its next pull cycle.

**Never** ask the user to "save in Designer" after a code edit. Designer round-tripping is what corrupts complex function strings — this skill exists specifically to avoid that.

## Topology cheat sheet (WSL2 + Windows)

- `robomotion-deskbot.exe` runs on the **Windows host**, not in WSL. Wine is impractical.
- All REST traffic from `rmo` reaches the cloud API directly — no special routing.
- The local HTTP In trigger listens on `127.0.0.1:9090` *on Windows*. From WSL that's `<host_ip>:9090` — `rmo_environment` returns `windows_host_ip` for use in curl commands.
- Flow repos clone to `C:\Users\<u>\.config\robomotion\agent\flows\<id>` on Windows; from WSL that's `/mnt/c/Users/<u>/.config/robomotion/agent/flows/<id>`. `rmo_flow_repo_path` resolves this automatically.
- Set `git config --global core.autocrlf input` once, or pushes from WSL on `/mnt/c/...` will produce noisy line-ending diffs.

## The AES alignment rule

If a flow uses an `Http In` trigger with AES encryption:
- The **trigger node** has an `aesKey` property (vault reference).
- Every `Core.Queue.Get` node downstream that reads the encrypted payload must set `optAESKey` to the same vault item.
- A mismatch silently produces empty / garbled queue items. Always check both when an HTTP-In flow stops processing.

## Hard limitations to surface honestly

- **No flow creation API.** `rmo` cannot create the empty shell flow — Designer is required for that one click. After it exists, everything else is automated.
- **No vault REST API.** Vault setup stays in Designer. Reference vault items by UUID from flow code (see `creating-flow` skill).
- **No queue REST API.** Same.
- **No remote log streaming API.** `rmo logs` only tails the local Windows-side deskbot log file. Remote-only triage is not possible.

## Related skills

- `creating-flow` — SDK grammar, node types, edge wiring. Read this *before* editing `main.ts`.
- `validating-flow` — pspec validator. `rmo flow validate` shells out to this.
- `testing-flow` — bun test harness. `rmo flow test` shells out to this.
- `running-flow` — historical event-stream conventions. `rmo` follows these.

## Setup docs (one-time)

- `docs/platforms.md` — install deskbot on Windows / macOS / Linux (distilled from the original setup scripts).
- `docs/errors.md` — Designer-corruption playbook, AES alignment, endpoint-mismatch debugging.
- `docs/git-workflow.md` — push-not-save policy and conflict resolution on `/mnt/c/...` paths.
