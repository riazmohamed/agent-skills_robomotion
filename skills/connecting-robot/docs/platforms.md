# Installing and connecting deskbot — per platform

The deskbot is a long-running process that registers a robot with the workspace, listens for run requests, and clones flow repos to disk. It must run on the OS where the automation actually executes (i.e. on Windows for desktop automation).

## Windows (the common case for WSL users)

1. Download Robomotion from https://robomotion.io/download. Default install: `C:\Program Files\Robomotion\`.
2. PowerShell (Admin): `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.
3. Run the connect script (created by the upstream setup script under `%USERPROFILE%\Robomotion\connect-robot.ps1`):
   ```powershell
   powershell -File "$env:USERPROFILE\Robomotion\connect-robot.ps1"
   ```
   Or directly:
   ```powershell
   & "C:\Program Files\Robomotion\robomotion-deskbot.exe" connect -n `
       -r <robot_id> -t <robot_token> -w <workspace>.robomotion.io -i <email>
   ```
4. Wait for `Connected to ... as <ROBOT_NAME>`. Leave the window open.
5. From WSL, verify with `rmo robot connected`.

If the user is on WSL and asks "where is the deskbot output?" — it is on the **Windows side**, in `C:\Users\<u>\AppData\Local\Robomotion\logs\`. From WSL that's `/mnt/c/Users/<u>/AppData/Local/Robomotion/logs/`. `rmo logs -f` resolves this automatically.

## macOS

```bash
/Applications/Robomotion.app/Contents/MacOS/robomotion-deskbot connect -n \
    -r <robot_id> -t <robot_token> -w <workspace>.robomotion.io -i <email>
```

Logs: `~/.config/robomotion/logs/`. Repos: `~/.config/robomotion/agent/flows/<id>`.

## Linux

```bash
/usr/local/bin/robomotion-deskbot connect -n \
    -r <robot_id> -t <robot_token> -w <workspace>.robomotion.io -i <email>
```

Logs: `~/.config/robomotion/logs/`. Repos: `~/.config/robomotion/agent/flows/<id>`.

## Recovering from "Robot is already connected"

Robomotion only allows one active deskbot per robot at a time. If you see this error, an old session is still registered:

1. Open Admin Console → Robots.
2. Find the robot, click its row, choose "Disconnect" (or kill any zombie deskbot process on the machine that previously owned the session).
3. Re-run the connect command.

Do not run two deskbots for the same robot ID concurrently — even briefly. Use one robot per machine, or create separate dev/prod robots.
