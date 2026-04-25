import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Static, Text, useApp } from "ink";
import { Banner } from "./components/Banner.tsx";
import { Footer } from "./components/Footer.tsx";
import { InputArea } from "./components/InputArea.tsx";
import { Spinner } from "./components/Spinner.tsx";
import { StatusLine } from "./components/StatusLine.tsx";
import { useTheme } from "./theme/theme.ts";
import { dispatchSlash } from "./commands/dispatch.ts";
import { SLASH_COMMANDS } from "./commands/registry.ts";
import { loadConfig, type RmoConfig } from "@rmo/core";

export interface AppProps {
  version: string;
  cwd: string;
}

export interface CompletedItem {
  id: number;
  kind: "command" | "result" | "error" | "system";
  text: string;
}

let idCounter = 0;
function nextId(): number {
  return ++idCounter;
}

function HistoryItem({ item }: { item: CompletedItem }) {
  const theme = useTheme();

  switch (item.kind) {
    case "command":
      return (
        <Box>
          <Text color={theme.primary}>❯ </Text>
          <Text>{item.text}</Text>
        </Box>
      );
    case "result":
      return <Text>{item.text}</Text>;
    case "error":
      return (
        <Box flexDirection="column">
          <StatusLine level="fail" message={item.text} />
          <Text>{item.text}</Text>
        </Box>
      );
    case "system":
      return <Text color={theme.textDim}>{item.text}</Text>;
    default:
      return null;
  }
}

export function App({ version, cwd }: AppProps): React.JSX.Element {
  const theme = useTheme();
  const { exit } = useApp();

  const [history, setHistory] = useState<CompletedItem[]>([]);
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState("");
  const [exitPending, setExitPending] = useState(false);

  const configRef = useRef<RmoConfig>(loadConfig());
  const config = configRef.current;

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleExit = useCallback(() => {
    if (exitPending) {
      process.exit(0);
    }
    setExitPending(true);
    exitTimerRef.current = setTimeout(() => {
      setExitPending(false);
    }, 2000);
  }, [exitPending]);

  const onSubmit = useCallback(
    async (input: string) => {
      const cmdId = nextId();
      setHistory((h) => [...h, { id: cmdId, kind: "command", text: input }]);

      if (!input.startsWith("/")) {
        setHistory((h) => [
          ...h,
          {
            id: nextId(),
            kind: "error",
            text: 'commands must start with "/" — type /help',
          },
        ]);
        return;
      }

      setRunning(true);
      setRunningLabel(input);

      const r = await dispatchSlash(input);

      setRunning(false);
      setRunningLabel("");

      if (r.output === "__CLEAR__") {
        setHistory([]);
        return;
      }

      setHistory((h) => [
        ...h,
        {
          id: nextId(),
          kind: r.ok ? "result" : "error",
          text: r.output,
        },
      ]);
    },
    [],
  );

  return (
    <Box flexDirection="column">
      <Banner
        version={version}
        cwd={cwd}
        workspace={config.workspace}
        authed={!!config.apiKey}
      />

      <Static items={history}>
        {(item) => <HistoryItem key={item.id} item={item} />}
      </Static>

      {running && <Spinner label={runningLabel} />}

      <InputArea
        onSubmit={onSubmit}
        onExit={handleExit}
        disabled={running}
        slashCommands={SLASH_COMMANDS}
      />

      <Footer
        workspace={config.workspace}
        authed={!!config.apiKey}
        apiBase={config.apiBase ?? "https://robomotion.io/api"}
        cwd={cwd}
      />
    </Box>
  );
}
