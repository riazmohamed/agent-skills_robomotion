import React from "react";
import { Text } from "ink";
import { useTheme } from "../theme/theme.ts";

interface StatusLineProps {
  level: "ok" | "fail" | "warn" | "info";
  message: string;
}

export function StatusLine({ level, message }: StatusLineProps) {
  const theme = useTheme();

  const glyphMap: Record<StatusLineProps["level"], string> = {
    ok: "✓",
    fail: "✗",
    warn: "!",
    info: "→",
  };

  const colorMap: Record<StatusLineProps["level"], string> = {
    ok: theme.success,
    fail: theme.error,
    warn: theme.warning,
    info: theme.textDim,
  };

  const glyph = glyphMap[level];
  const color = colorMap[level];

  return (
    <Text>
      <Text color={color} bold>
        {glyph}
      </Text>{" "}
      <Text color={theme.text}>{message}</Text>
    </Text>
  );
}
