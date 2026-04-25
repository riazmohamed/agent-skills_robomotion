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

  // Always use stacked layout: logo on top, info below.
  // Side-by-side layout breaks in split-pane terminals (e.g. Warp) where
  // stdout.columns reports full terminal width, not individual pane width,
  // causing rows to wrap and destroying the logo's vertical alignment.
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1} width={columns}>
      <Box flexDirection="column">
        {LOGO_LINES.map((line, i) => (
          <Text key={i} color={rowColor(i, LOGO_LINES.length)}>
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        {/* Logo wordmark already says "ROBOMOTION CLI" — just show version + workspace. */}
        <Text color={theme.textDim}>v{version} · </Text>
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

/**
 * Pick the gradient color for a given logo row.
 * Maps row index across the cyan→purple half of the GRADIENT (first 7 stops),
 * so each row is one solid color and the gradient flows top→bottom.
 * Per-character gradient is intentionally avoided — it shreds letterform
 * cohesion on multi-row figlet glyphs (each cell of one letter ends up a
 * different color, so the eye can't group strokes into letters).
 */
function rowColor(rowIdx: number, totalRows: number): string {
  // GRADIENT is a palindrome (cyan → purple → cyan); use only the forward half.
  const forward = GRADIENT.slice(0, 7);
  const t = totalRows <= 1 ? 0 : rowIdx / (totalRows - 1);
  const idx = Math.min(forward.length - 1, Math.round(t * (forward.length - 1)));
  return forward[idx]!;
}
