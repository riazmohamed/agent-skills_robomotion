# Git-push workflow for flow code

The robot's deskbot clones each flow's repo to `~/.config/robomotion/agent/flows/<flow_id>` on connect. The remote is the workspace's git server. Editing `main.ts` and pushing is the supported way to ship code changes — Designer save is not.

## Files you edit vs files you don't

| Edit | Never touch |
|---|---|
| `main.ts` | `main.designer.ts` |
| `subflows/*.ts` | `subflows/*.designer.ts` |
| `.generated/...` (when present, machine-managed) ❌ |  |

The `.designer.ts` files store visual layout (node positions, colors, group boxes). Editing them by hand corrupts the Designer rendering.

## The push cycle

```bash
# from a Claude/rmo session — the rmo_push_flow tool does this automatically:
git -C "$FLOW_REPO" add main.ts subflows/
git -C "$FLOW_REPO" commit -m "rmo: <one-line description>"
git -C "$FLOW_REPO" fetch origin
git -C "$FLOW_REPO" rebase origin/main
git -C "$FLOW_REPO" push origin HEAD:main
```

Always rebase before pushing — the deskbot may have committed a designer-metadata refresh while you were editing.

## WSL on /mnt/c gotchas

When the flow repo lives on the Windows filesystem (`/mnt/c/Users/<u>/.config/robomotion/agent/flows/<id>`) and you operate on it from WSL:

- **Line endings.** Set `git config --global core.autocrlf input` once. Without it, every push from WSL produces a diff against the deskbot's CRLF line endings on Windows.
- **File modes.** `core.filemode` is best left at git's default (auto-detected to `false` on `/mnt/c/`). Don't override it.
- **Permissions.** The Windows-mounted filesystem ignores chmod from WSL. Don't try to `chmod 600` in this tree.

## Resolving conflicts during rebase

If `git rebase origin/main` fails with conflicts:

1. The conflict is almost always in `*.designer.ts` (deskbot regenerated metadata).
2. Resolve by accepting `theirs` for `.designer.ts` files (`git checkout --theirs main.designer.ts`).
3. Resolve `main.ts` / `subflows/*.ts` conflicts manually — these contain real logic.
4. `git rebase --continue`, then push.

If `git push` is rejected with "fetch first" after a successful rebase, something else pushed between your fetch and push — re-run `rmo flow push`.

## What "designer corruption" actually means in this context

The remote git history is the source of truth. The Designer UI's in-browser editor occasionally serializes a flow to JSON in a way that breaks function-string escaping on save. That bad JSON then becomes the latest commit. The mitigation is *never* press Save in Designer for a flow whose function strings you've edited via code — push via git only. View it in Designer, but don't save from there.
