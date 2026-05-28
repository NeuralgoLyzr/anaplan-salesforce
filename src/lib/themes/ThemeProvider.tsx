"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { themes, defaultTheme, type Theme } from "./registry";
import { generateThemeVars } from "./utils";

const STORAGE_KEY = "ui-theme";
const CUSTOM_KEY  = "ui-custom-themes";

type ThemeContextType = {
  current:          Theme;
  allThemes:        Theme[];
  setTheme:         (id: string) => void;
  addCustomTheme:   (theme: Theme) => void;
  deleteCustomTheme:(id: string) => void;
  updateThemePreview:(options: Partial<Theme>) => void;
  resetThemePreview:() => void;
};

const ThemeContext = createContext<ThemeContextType>({
  current:          defaultTheme,
  allThemes:        themes,
  setTheme:         () => {},
  addCustomTheme:   () => {},
  deleteCustomTheme:() => {},
  updateThemePreview:() => {},
  resetThemePreview:() => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentId,    setCurrentId]    = useState("default");
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);

  // Restore saved theme + custom themes on mount
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY) ?? "default";
    const savedCustom: Theme[] = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");

    setCustomThemes(savedCustom);

    const all = [...themes, ...savedCustom];
    const found = all.find(t => t.id === savedId) ?? defaultTheme;
    applyThemeVars(found);
    setCurrentId(found.id);
  }, []);

  // System dark theme preference tracking
  useEffect(() => {
    const all = [...themes, ...customThemes];
    const activeTheme = previewTheme || all.find(t => t.id === currentId) || defaultTheme;

    if (activeTheme.mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      applyThemeVars(activeTheme);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [currentId, customThemes, previewTheme]);

  const setTheme = useCallback((id: string) => {
    const all = [...themes, ...customThemes];
    const found = all.find(t => t.id === id) ?? defaultTheme;
    applyThemeVars(found);
    setCurrentId(id);
    setPreviewTheme(null);
    localStorage.setItem(STORAGE_KEY, id);
  }, [customThemes]);

  const addCustomTheme = useCallback((theme: Theme) => {
    setCustomThemes(prev => {
      const updated = [...prev.filter(t => t.id !== theme.id), theme];
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
      return updated;
    });
    applyThemeVars(theme);
    setCurrentId(theme.id);
    setPreviewTheme(null);
    localStorage.setItem(STORAGE_KEY, theme.id);
  }, []);

  const deleteCustomTheme = useCallback((id: string) => {
    setCustomThemes(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
      return updated;
    });
    // Fall back to default if active theme was deleted
    setCurrentId(prev => {
      if (prev === id) {
        applyThemeVars(defaultTheme);
        localStorage.setItem(STORAGE_KEY, "default");
        return "default";
      }
      return prev;
    });
  }, []);

  // Live customizer preview methods (transient adjustments in UI before saving)
  const updateThemePreview = useCallback((options: Partial<Theme>) => {
    const all = [...themes, ...customThemes];
    const base = all.find(t => t.id === currentId) || defaultTheme;
    
    // Construct preview theme configuration
    const merged: Theme = {
      ...base,
      ...options,
      // Merge style record variables
      vars: {
        ...base.vars,
        ...(options.vars || {})
      }
    };

    setPreviewTheme(merged);
    applyThemeVars(merged);
  }, [currentId, customThemes]);

  const resetThemePreview = useCallback(() => {
    setPreviewTheme(null);
    const all = [...themes, ...customThemes];
    const found = all.find(t => t.id === currentId) ?? defaultTheme;
    applyThemeVars(found);
  }, [currentId, customThemes]);

  const allThemes   = [...themes, ...customThemes];
  const currentTheme = previewTheme || allThemes.find(t => t.id === currentId) || defaultTheme;

  return (
    <ThemeContext.Provider value={{
      current: currentTheme,
      allThemes,
      setTheme,
      addCustomTheme,
      deleteCustomTheme,
      updateThemePreview,
      resetThemePreview
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

function applyThemeVars(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  
  // Set global theme data selector
  root.setAttribute("data-theme", theme.id);

  // Generate detailed dynamic corporate variables
  const computed = generateThemeVars(theme);

  // Inject generated custom properties
  Object.entries(computed).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Inject any direct registry overrides
  if (theme.vars) {
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // Handle Dark / Light / System Mode class toggle
  const isDark = 
    theme.mode === "dark" || 
    (theme.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
