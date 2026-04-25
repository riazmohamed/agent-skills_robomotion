import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/theme.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";
import { LOGO_LINES, GRADIENT } from "../constants/banner.ts";

interface BannerProps {
  version: string;
  cwd: string;
  workspace?: string;
  authed: boolean;
}

export function Banner({ version, cwd, workspace, authed }: BannerProps) {
  const theme = useTheme();
  const { columns } = useTerminalSize();

  const home = process.env.HOME ?? "";
  const displayPath = home && cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;

  const shift = 0;

  // Always use stacked layout: logo on top, info below.
  // Side-by-side layout breaks in split-pane terminals (e.g. Warp) where
  // stdout.columns reports full terminal width, not individual pane width,
  // causing rows to wrap and destroying the logo's vertical alignment.
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1} width={columns}>
      <Box flexDirection="column">
        <GradientText text={LOGO_LINES[0]!} shift={shift} />
        <GradientText text={LOGO_LINES[1]!} shift={shift} />
        <GradientText text={LOGO_LINES[2]!} shift={shift} />
      </Box>
      <Box marginTop={1}>
        <Text color={theme.primary} bold>
          Robomotion CLI
        </Text>
        <Text color={theme.textDim}> v{version}</Text>
        <Text color={theme.textDim}> · </Text>
        <Text color={theme.secondary}>{authed ? (workspace ?? "") : "not logged in"}</Text>
      </Box>
      <Box>
        <Text color={theme.textDim} wrap="truncate">
          {displayPath}
        </Text>
      </Box>
      <Box>
        <Text color={theme.primary}>^F</Text>
        <Text color={theme.textDim}> flows</Text>
        <Text color={theme.textDim}>{"  "}</Text>
        <Text color={theme.primary}>^R</Text>
        <Text color={theme.textDim}> robots</Text>
        <Text color={theme.textDim}>{"  "}</Text>
        <Text color={theme.primary}>^J</Text>
        <Text color={theme.textDim}> jobs</Text>
        <Text color={theme.textDim}>{"  "}</Text>
        <Text color={theme.primary}>^L</Text>
        <Text color={theme.textDim}> logs</Text>
        <Text color={theme.textDim}>{"  "}</Text>
        <Text color={theme.primary}>/help</Text>
      </Box>
    </Box>
  );
}

function GradientText({ text, shift = 0 }: { text: string; shift?: number }) {
  const chars: React.ReactNode[] = [];
  let colorIdx = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") {
      chars.push(ch);
    } else {
      const color = GRADIENT[(colorIdx + shift) % GRADIENT.length];
      chars.push(
        <Text key={i} color={color}>
          {ch}
        </Text>,
      );
      colorIdx++;
    }
  }
  return <Text>{chars}</Text>;
}
