import type { ReactNode } from "react";
import { useThemeState } from "@/hooks/use-theme";
import { ThemeContext } from "./theme-context";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
