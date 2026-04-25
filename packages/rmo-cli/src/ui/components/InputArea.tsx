import React, { useState, useRef, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../theme/theme.js";
import {
  SlashCommandMenu,
  filterCommands,
  type SlashCommandInfo,
} from "./SlashCommandMenu.tsx";

export type { SlashCommandInfo };

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const historyRef = useRef<string[]>([]);
  const draftRef = useRef("");

  // Filter slash commands by text after the leading "/".
  const slashFilter = text.startsWith("/") ? text.slice(1) : "";
  const filteredCommands = useMemo(
    () => filterCommands(slashCommands, slashFilter),
    [slashCommands, slashFilter],
  );

  // Whenever the filter changes, reset selection to the first match.
  // Without this, typing to narrow the list could leave selectedIndex
  // pointing past the end of the filtered array.
  useEffect(() => {
    setSelectedIndex(0);
  }, [slashFilter]);

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

      // Enter — submit. If slash menu is open with matches, submit the
      // currently-highlighted command instead of the raw text. Otherwise
      // submit the trimmed text as-is.
      if (key.return) {
        if (slashMenuOpen && filteredCommands.length > 0) {
          const picked = filteredCommands[selectedIndex] ?? filteredCommands[0]!;
          const cmdText = "/" + picked.name;
          const hist = historyRef.current;
          if (hist[hist.length - 1] !== cmdText) {
            hist.push(cmdText);
            if (hist.length > MAX_HISTORY) hist.shift();
          }
          onSubmit(cmdText);
          setText("");
          setCursor(0);
          setHistoryIndex(-1);
          setSlashMenuOpen(false);
          setSelectedIndex(0);
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

      // Esc — close menu first if open, otherwise clear input
      if (key.escape) {
        if (slashMenuOpen) {
          setSlashMenuOpen(false);
          setSelectedIndex(0);
          return;
        }
        setText("");
        setCursor(0);
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

      // Up arrow — navigate slash menu when open, otherwise history previous
      if (key.upArrow) {
        if (slashMenuOpen && filteredCommands.length > 0) {
          setSelectedIndex((i) => (i <= 0 ? filteredCommands.length - 1 : i - 1));
          return;
        }
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

      // Down arrow — navigate slash menu when open, otherwise history next
      if (key.downArrow) {
        if (slashMenuOpen && filteredCommands.length > 0) {
          setSelectedIndex((i) => (i >= filteredCommands.length - 1 ? 0 : i + 1));
          return;
        }
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

      // Tab — autocomplete the highlighted slash command into the input
      if (key.tab && slashMenuOpen && filteredCommands.length > 0) {
        const picked = filteredCommands[selectedIndex] ?? filteredCommands[0]!;
        const completed = "/" + picked.name;
        setText(completed);
        setCursor(completed.length);
        return;
      }

      // Regular character input
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        const newText = text.slice(0, cursor) + input + text.slice(cursor);
        setText(newText);
        setCursor(cursor + 1);

        // Open the slash menu as soon as the line begins with "/";
        // close it the moment the line stops starting with "/".
        if (newText.startsWith("/")) {
          if (!slashMenuOpen) setSlashMenuOpen(true);
        } else if (slashMenuOpen) {
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
        <SlashCommandMenu
          commands={slashCommands}
          filter={slashFilter}
          selectedIndex={selectedIndex}
          onSelect={() => {}}
          onCancel={() => setSlashMenuOpen(false)}
        />
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
