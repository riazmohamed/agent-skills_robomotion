import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/theme.ts";

interface TableProps {
  rows: Record<string, unknown>[];
}

export function Table({ rows }: TableProps) {
  const theme = useTheme();

  if (rows.length === 0) {
    return <Text color={theme.textDim}>(empty)</Text>;
  }

  const cols = Object.keys(rows[0] ?? {});
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );

  const headerRow = cols.map((c, i) => c.padEnd(widths[i] ?? c.length)).join(" │ ");
  const separatorRow = widths.map((w) => "─".repeat(w)).join("─┼─");

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={theme.primary} bold>
          {headerRow}
        </Text>
      </Text>
      <Text color={theme.border}>{separatorRow}</Text>
      {rows.map((r, rowIdx) => {
        const rowColor = rowIdx % 2 === 0 ? theme.text : theme.textDim;
        const cells = cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i] ?? 0)).join(" │ ");
        return (
          <Text key={rowIdx} color={rowColor}>
            {cells}
          </Text>
        );
      })}
    </Box>
  );
}
