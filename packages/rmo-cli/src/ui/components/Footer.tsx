import React from "react";
import { Text, Box } from "ink";
import { useTheme } from "../theme/theme.ts";
import { useTerminalSize } from "../hooks/useTerminalSize.ts";

export interface FooterProps {
  workspace?: string;
  authed: boolean;
  apiBase: string;
  cwd: string;
  jobs?: number;
}

const API_BASE_MAX_LEN = 30;

export function Footer({ workspace, authed, apiBase, cwd, jobs }: FooterProps) {
  const theme = useTheme();
  const { columns } = useTerminalSize();

  // Show only the current directory name
  const parts = cwd.split("/").filter(Boolean);
  const displayPath: string = parts.length > 0 ? (parts[parts.length - 1] ?? cwd) : cwd;

  const sep = <Text color={theme.border}>{" \u2502 "}</Text>;

  const workspaceText = workspace ?? "no workspace";
  const authText = authed ? "auth \u2713" : "auth \u2717";
  const authColor = authed ? theme.success : theme.error;

  const truncatedApiBase =
    apiBase.length > API_BASE_MAX_LEN
      ? apiBase.slice(0, API_BASE_MAX_LEN - 1) + "\u2026"
      : apiBase;

  // Calculate whether everything fits on one line
  const leftLen =
    displayPath.length +
    (jobs && jobs > 0 ? 3 + String(jobs).length + 6 : 0);
  const rightLen =
    workspaceText.length +
    3 +
    authText.length +
    3 +
    truncatedApiBase.length;
  const availableWidth = columns - 2;
  const fitsOnOneLine = leftLen + rightLen <= availableWidth;

  const maxPath = fitsOnOneLine ? availableWidth - rightLen - 2 : availableWidth;
  const truncPath =
    displayPath.length > maxPath && maxPath > 10
      ? "\u2026" + displayPath.slice(displayPath.length - maxPath + 1)
      : displayPath;

  // Shared right-side content
  const rightContent = (
    <>
      <Text color={theme.primary} bold>
        {workspaceText}
      </Text>
      {sep}
      <Text color={authColor}>{authText}</Text>
      {sep}
      <Text color={theme.textDim}>{truncatedApiBase}</Text>
    </>
  );

  if (fitsOnOneLine) {
    return (
      <Box paddingLeft={1} paddingRight={1} width={columns}>
        <Box flexGrow={1}>
          <Text color={theme.textDim}>{truncPath}</Text>
          {jobs && jobs > 0 && (
            <>
              {sep}
              <Text color={theme.secondary}>
                {jobs} job{jobs !== 1 ? "s" : ""}
              </Text>
            </>
          )}
        </Box>
        <Box flexShrink={0}>{rightContent}</Box>
      </Box>
    );
  }

  // Two-line layout
  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1} width={columns}>
      <Box>
        <Text color={theme.textDim} wrap="truncate">
          {truncPath}
        </Text>
        {jobs && jobs > 0 && (
          <>
            {sep}
            <Text color={theme.secondary} wrap="truncate">
              {jobs} job{jobs !== 1 ? "s" : ""}
            </Text>
          </>
        )}
      </Box>
      <Box>{rightContent}</Box>
    </Box>
  );
}
