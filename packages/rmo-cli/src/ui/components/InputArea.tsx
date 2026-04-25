import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../theme/theme.js";

/** Info about a slash command. */
export interface SlashCommandInfo {
  name: string;
  description: string;
}

interface InputAreaProps {
  onSubmit: (text: string) => void;
  onExit: () => void;
  disabled?: boolean;
  slashCommands: SlashCommandInfo[];
}

const PROMPT = "❯ ";
const MAX_HISTORY = 50;

export function InputArea({ onSubmit, onExit, disabled = false, slashCommands }: InputAreaProps) {
  const theme = useTheme();

  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);

  const historyRef = useRef<string[]>([]);
  const draftRef = useRef("");

  useInput(
    (input, key) => {
      // Reset history navigation on non-arrow keypress
      if (historyIndex !== -1 && !key.upArrow && !key.downArrow) {
        setHistoryIndex(-1);
        draftRef.current = "";
      }

      // Ctrl+C — exit
      if (key.ctrl && input === "c") {
        onExit();
        return;
      }

      // Enter — submit
      if (key.return) {
        if (slashMenuOpen) {
          // Slash menu selection handled by parent; just close here
          setSlashMenuOpen(false);
          return;
        }
        const trimmed = text.trim();
        if (trimmed) {
          const hist = historyRef.current;
          if (hist[hist.length - 1] !== trimmed) {
            hist.push(trimmed);
            if (hist.length > MAX_HISTORY) hist.shift();
          }
          onSubmit(trimmed);
          setText("");
          setCursor(0);
          setHistoryIndex(-1);
        }
        return;
      }

      // Esc — clear input
      if (key.escape) {
        setText("");
        setCursor(0);
        setSlashMenuOpen(false);
        return;
      }

      // Backspace / Delete
      if (key.backspace || key.delete) {
        if (cursor > 0) {
          setText((t) => t.slice(0, cursor - 1) + t.slice(cursor));
          setCursor((c) => c - 1);
        }
        return;
      }

      // Left arrow
      if (key.leftArrow) {
        if (cursor > 0) setCursor((c) => c - 1);
        return;
      }

      // Right arrow
      if (key.rightArrow) {
        if (cursor < text.length) setCursor((c) => c + 1);
        return;
      }

      // Up arrow — history previous
      if (key.upArrow) {
        const hist = historyRef.current;
        if (hist.length === 0) return;
        if (historyIndex === -1) {
          draftRef.current = text;
          const idx = hist.length - 1;
          const entry = hist[idx];
          if (entry === undefined) return;
          setHistoryIndex(idx);
          setText(entry);
          setCursor(entry.length);
        } else {
          const idx = Math.max(0, historyIndex - 1);
          const entry = hist[idx];
          if (entry === undefined) return;
          setHistoryIndex(idx);
          setText(entry);
          setCursor(entry.length);
        }
        return;
      }

      // Down arrow — history next
      if (key.downArrow) {
        const hist = historyRef.current;
        if (historyIndex === -1) return;
        const next = historyIndex + 1;
        if (next >= hist.length) {
          setHistoryIndex(-1);
          setText(draftRef.current);
          setCursor(draftRef.current.length);
          draftRef.current = "";
        } else {
          const entry = hist[next];
          if (entry === undefined) return;
          setHistoryIndex(next);
          setText(entry);
          setCursor(entry.length);
        }
        return;
      }

      // Regular character input
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        const newText = text.slice(0, cursor) + input + text.slice(cursor);
        setText(newText);
        setCursor(cursor + 1);

        // Detect slash menu trigger
        if (newText === "/") {
          setSlashMenuOpen(true);
        } else if (slashMenuOpen && !newText.startsWith("/")) {
          setSlashMenuOpen(false);
        }
        return;
      }
    },
    { isActive: !disabled },
  );

  if (disabled) return null;

  const beforeCursor = text.slice(0, cursor);
  const atCursor = cursor < text.length ? text[cursor] : " ";
  const afterCursor = cursor < text.length ? text.slice(cursor + 1) : "";

  return (
    <Box flexDirection="column">
      {slashMenuOpen && (
        <Box flexDirection="column" paddingLeft={2}>
          {slashCommands
            .filter((cmd) => {
              const filter = text.slice(1).toLowerCase();
              if (!filter) return true;
              return cmd.name.toLowerCase().startsWith(filter);
            })
            .map((cmd) => (
              <Box key={cmd.name}>
                <Text color={theme.commandColor}>/{cmd.name}</Text>
                <Text color={theme.textDim}> — {cmd.description}</Text>
              </Box>
            ))}
        </Box>
      )}
      <Box>
        <Text color={theme.inputPrompt} bold>
          {PROMPT}
        </Text>
        <Text color={theme.text}>{beforeCursor}</Text>
        <Text color={theme.text} inverse>
          {atCursor}
        </Text>
        <Text color={theme.text}>{afterCursor}</Text>
      </Box>
    </Box>
  );
}
