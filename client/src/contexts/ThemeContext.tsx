import React, { createContext, useContext, useEffect, useState } from "react";

// Only two themes: blue (light/day) and navy (dark/night)
export type Theme = "blue" | "navy";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "navy",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored === "blue" || stored === "navy") return stored;
      // Migrate old values: light/blue → blue, dark/navy → navy
      if (stored === "light") return "blue";
      if (stored === "dark") return "navy";
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "blue", "navy", "light");
    if (theme === "blue") {
      root.classList.add("blue");
    } else {
      root.classList.add("navy");
    }
    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  function setTheme(t: Theme) {
    setThemeState(t);
  }

  const toggleTheme = () => {
    setThemeState(prev => (prev === "navy" ? "blue" : "navy"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
