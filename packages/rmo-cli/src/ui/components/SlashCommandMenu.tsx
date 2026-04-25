import { Box, Text } from "ink";
import { useTheme } from "../theme/theme.ts";
import { DASHED_H } from "../constants/figures.ts";

export interface SlashCommandInfo {
  name: string;
  description: string;
}

export interface SlashCommandMenuProps {
  commands: SlashCommandInfo[];
  filter: string;
  selectedIndex: number;
  onSelect: (cmd: SlashCommandInfo) => void;
  onCancel: () => void;
}

const WINDOW_SIZE = 10;

export function filterCommands(
  all: SlashCommandInfo[],
  filter: string,
): SlashCommandInfo[] {
  if (!filter) return all;
  const lower = filter.toLowerCase();
  return all.filter((cmd) => cmd.name.toLowerCase().includes(lower));
}

export function SlashCommandMenu({
  commands,
  filter,
  selectedIndex,
}: SlashCommandMenuProps) {
  const theme = useTheme();

  const filtered = filterCommands(commands, filter);

  const total = filtered.length;
  const clampedIndex = Math.min(
    Math.max(selectedIndex, 0),
    Math.max(0, total - 1),
  );

  const useWindow = total > WINDOW_SIZE;
  const start = useWindow
    ? Math.max(
        0,
        Math.min(clampedIndex - Math.floor(WINDOW_SIZE / 2), total - WINDOW_SIZE),
      )
    : 0;
  const end = useWindow ? Math.min(start + WINDOW_SIZE, total) : total;
  const visible = filtered.slice(start, end);
  const hasAbove = useWindow && start > 0;
  const hasBelow = useWindow && end < total;

  return (
    <Box flexDirection="column">
      <Text color={theme.border}>
        {DASHED_H}{DASHED_H} slash commands {DASHED_H}{DASHED_H}
      </Text>

      {hasAbove && <Text color={theme.border}> ↑ {start} more</Text>}

      {visible.map((cmd, i) => {
        const index = start + i;
        const isSelected = index === clampedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={isSelected ? theme.primary : theme.text} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
              /{cmd.name}
            </Text>
            <Text color={isSelected ? theme.text : theme.textDim}>
              {" "}— {cmd.description}
            </Text>
          </Box>
        );
      })}

      {total === 0 && (
        <Text color={theme.textDim}>(no matching commands)</Text>
      )}

      {hasBelow && <Text color={theme.border}> ↓ {total - end} more</Text>}

      <Text color={theme.textDim}>↑↓ navigate · Enter select · Esc cancel</Text>
    </Box>
  );
}
