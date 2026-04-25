import { createContext, useContext } from "react";
import darkTheme from "./dark.json" with { type: "json" };
import lightTheme from "./light.json" with { type: "json" };

export type Theme = typeof darkTheme;

export type ThemeName = "dark" | "light";

export function loadTheme(name: ThemeName): Theme {
  switch (name) {
    case "light":
      return lightTheme;
    default:
      return darkTheme;
  }
}

export const ThemeContext = createContext<Theme>(darkTheme);

/** Callback to switch theme at runtime. Null when not inside ThemeProvider. */
export const SetThemeContext = createContext<((name: ThemeName) => void) | null>(null);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Returns a function to switch themes at runtime. Returns null if not available. */
export function useSetTheme(): ((name: ThemeName) => void) | null {
  return useContext(SetThemeContext);
}
