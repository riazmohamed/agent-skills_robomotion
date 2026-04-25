# Common errors and fixes

| Error | Why | Fix |
|---|---|---|
| `unexpected end of JSON input` at runtime | Designer corrupted the flow JSON when saving a complex function string. | Edit `main.ts` directly, `rmo flow push <flow>`. Do not re-save in Designer. If the flow's saved JSON is already corrupt, create a brand new flow that has never been saved in Designer and push your code to it. |
| `Stop acknowledgement received from server` | Server's corrupted Designer JSON overrides clean git code. | Same as above — start over with a fresh flow that's never been opened in Designer's editor. |
| `Flow validation failed` (node output port) | A node with zero outputs was chained as if it had an output (e.g. `Debug.Log` → `.then(...)`). | Remove the invalid edge. Terminal nodes (Debug, Log, Stop, End) NEVER chain `.then()`. |
| `Robot is already connected` | Old deskbot session still registered. | Disconnect old session in Admin Console → Robots, then reconnect. |
| `404 Not Found` on local trigger endpoint | The `Http In` endpoint path in `main.ts` doesn't match the URL you're calling, or deskbot's HTTP listener isn't running. | Re-read `main.ts`, confirm the `endpoint` property. Check deskbot log for `[HttpIn] Trigger created: endpoint=/...` lines. |
| `operation not permitted` accessing `~/.config/robomotion/...` | Sandbox/permission issue on the AI tool side (Windsurf, etc). | `rmo_environment` will report this. For Windsurf, update its `sandbox.json` allowlist. For Claude Code on WSL, ensure `/mnt/c/...` is reachable. |
| `failed to create directory .../versions/...` | Stuck cache directory from a previous version checkout. | Stop deskbot. Delete `~/.config/robomotion/cache/repositories/<flow_id>/versions/` on Windows. Restart deskbot. |
| HTTP-In flow runs but queue items are empty | AES key on the trigger ≠ `optAESKey` on the `Core.Queue.Get` node. | Open both nodes' properties; ensure both reference the same vault item UUID. See `SKILL.md` → "AES alignment rule". |
| `rmo logs` says no log file found | Deskbot is not running on Windows, or its log directory is not at the default path. | Check the connect-robot script is running; `rmo logs --file <path>` to override. |
| WSL `curl http://127.0.0.1:9090/...` connection refused | Deskbot's HTTP listener binds on Windows; `localhost` from WSL doesn't reach it in default NAT mode. | Use the Windows host IP from `rmo_environment` → `windows_host_ip` instead of `127.0.0.1`, or enable Windows 11 mirrored networking. |

## API surface gotchas (verified 2026-04-25 against api.robomotion.io)

These diverge from what the published docs imply:

- `/v1/flows.list` is **user-scoped, not workspace-scoped**. Flows owned by other accounts in the same workspace are invisible. Symptom: empty `flows` array even though `jobs.list` shows real flow runs.
   - Workaround: `rmo` falls back to `/v1/jobs.list` to derive flow ids/names from execution history.
- `/v1/flows.listPublished` and `/v1/flows.listShared` **404 on the cloud** (`api.robomotion.io`). The docs claim they exist; the live API rejects them. `rmo`'s `listAll` swallows these 404s and returns whatever `flows.list` did return.
- `/v1/flows.run` returns **HTTP 200 with `{"ok":false,"error":"flow_not_found"}`** when the flow exists in the workspace but is owned by a different user. The HTTP status alone is misleading — always check the JSON `ok` field. `rmo` does this in its API client.
- `/v1/flows.stop` **always returns `invalid_arguments`** regardless of body shape — the live endpoint appears broken. Use `/v1/jobs.stop` with `{job_id}` instead. `rmo flow stop` and the `rmo_stop_flow` MCP tool both call jobs.stop.
- Duplicate flow names are common (people leave 4 flows all called "test"). `rmo`'s fuzzy match picks the first exact-name hit; pass the full UUID to disambiguate.

## Triage order when a flow run "doesn't work"

1. `rmo_environment` — auth, host IP, mounts.
2. `rmo_auth_check` — token still valid?
3. `rmo_robots_connected` — is anything actually listening?
4. `rmo_list_jobs` with `status: "running"` then `status: "failed"` — did the run start? did it fail?
5. Tail the deskbot log (Bash `tail -F` on the resolved log path).
6. If the flow uses HTTP In: hit the endpoint with `curl` against `windows_host_ip:9090/...`.
7. If the flow uses queues: check Designer's queue inspector for items in the wrong state.
