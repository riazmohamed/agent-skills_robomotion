import React from "react";
import { render } from "ink";
import { App } from "./App.tsx";
import {
  ThemeContext,
  SetThemeContext,
  loadTheme,
  type ThemeName,
} from "./theme/theme.ts";
import { detectTheme } from "./theme/detect-theme.ts";
import { TerminalSizeProvider } from "./hooks/useTerminalSize.ts";
import { AnimationProvider } from "./components/AnimationContext.tsx";

export interface RenderConfig {
  version: string;
  cwd: string;
  theme?: "auto" | "dark" | "light";
}

/** Stateful theme provider — enables runtime theme switching via useSetTheme(). */
function ThemeProvider({
  initial,
  children,
}: React.PropsWithChildren<{
  initial: ThemeName;
}>) {
  const [themeName, setThemeName] = React.useState(initial);
  const theme = React.useMemo(() => loadTheme(themeName), [themeName]);
  const setTheme = React.useCallback(
    (name: ThemeName) => setThemeName(name),
    [],
  );

  return React.createElement(
    SetThemeContext.Provider,
    { value: setTheme },
    React.createElement(
      ThemeContext.Provider,
      { value: theme },
      children,
    ),
  );
}

export async function runInteractive(config: RenderConfig): Promise<void> {
  const themeSetting = config.theme ?? "auto";
  const resolvedTheme =
    themeSetting === "auto" ? await detectTheme() : themeSetting;

  // Clear screen + scrollback so old commands don't appear above the TUI
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");

  const { waitUntilExit, clear } = render(
    React.createElement(
      ThemeProvider,
      { initial: resolvedTheme },
      React.createElement(
        TerminalSizeProvider,
        null,
        React.createElement(
          AnimationProvider,
          null,
          React.createElement(App, {
            version: config.version,
            cwd: config.cwd,
          }),
        ),
      ),
    ),
    {
      exitOnCtrlC: false,
    },
  );

  // Resize handling: debounce Ink's clear() so it only fires once after the
  // user finishes dragging.  Previously clear() fired on every resize event
  // (many per drag), causing Ink to lose its line tracking and re-render the
  // live area at new positions — leaving ghost/duplicate copies in scrollback.
  // The React-side useTerminalSize hook handles screen clearing and Static
  // remount via its own 300ms debounce + resizeKey bump.
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      clear();
    }, 300);
  };
  process.stdout.on("resize", onResize);

  await waitUntilExit();

  process.stdout.off("resize", onResize);
  if (resizeTimer) clearTimeout(resizeTimer);
}
