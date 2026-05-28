"use client";

import { useState } from "react";
import { Paintbrush, Check } from "lucide-react";
import { useTheme } from "@/lib/themes/ThemeProvider";
import { cn } from "@/lib/utils";

/** Small dot in the header showing the active theme's primary color */
export function ActiveThemeDot() {
  const { current } = useTheme();
  return (
    <span
      title={`Theme: ${current.label} — click to change`}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border hover:bg-accent/10 transition-colors text-xs text-muted-foreground"
    >
      <Paintbrush className="w-3.5 h-3.5" />
      <span className="hidden sm:block">{current.label}</span>
      <span
        className="w-2.5 h-2.5 rounded-full border border-black/10"
        style={{ background: current.primaryHex }}
      />
    </span>
  );
}

export function ThemeSwitcher() {
  const { current, setTheme, allThemes } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch theme"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "border border-border text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground transition-all duration-150",
          open && "bg-accent text-accent-foreground"
        )}
      >
        <Paintbrush className="w-3.5 h-3.5" />
        <span className="hidden sm:block">{current.label}</span>
        {/* Live color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/10"
          style={{ background: current.primaryHex }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-card rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs font-semibold text-foreground tracking-wide">Theme</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Changes apply across all pages
              </p>
            </div>

            {/* Theme grid */}
            <div className="p-3 grid grid-cols-1 gap-1.5">
              {allThemes.map(theme => {
                const isActive = current.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                      isActive
                        ? "bg-primary/10 border border-primary/25"
                        : "hover:bg-black/[0.04] border border-transparent"
                    )}
                  >
                    {/* Company initials avatar */}
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: theme.sidebarHex }}
                    >
                      {theme.initials}
                    </span>

                    {/* Name + swatch */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {theme.label}
                      </p>
                      {/* Color palette row */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Swatch hex={theme.primaryHex} />
                        <Swatch hex={theme.sidebarHex} />
                      </div>
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/30">
              <p className="text-[11px] text-muted-foreground">
                Theme is saved automatically
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
      style={{ background: hex }}
    />
  );
}
