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
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] border border-[#e6ebf8] hover:bg-[#e6ebf8]/10 transition-colors text-[0.75rem] leading-[1.2] text-[#485478]"
    >
      <Paintbrush className="w-3.5 h-3.5" />
      <span className="hidden sm:block">{current.label}</span>
      <span
        className="w-2.5 h-2.5 rounded-full border border-[#e6ebf8]"
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
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[0.75rem] leading-[1.2] font-medium",
          "border border-[#e6ebf8] text-[#485478]",
          "hover:bg-[#e6ebf8] hover:text-[#242d48] transition-all duration-150",
          open && "bg-[#e6ebf8] text-[#242d48]"
        )}
      >
        <Paintbrush className="w-3.5 h-3.5" />
        <span className="hidden sm:block">{current.label}</span>
        {/* Live color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-[#e6ebf8]"
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

          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-[0_4px_8px_rgba(36,45,72,0.20)] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#e6ebf8]/50">
              <p className="text-[0.75rem] leading-[1.2] font-semibold text-[#242d48] ">Theme</p>
              <p className="text-[0.75rem] text-[#485478] mt-0.5">
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
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-150 text-left",
                      isActive
                        ? "bg-[#e6ebf8] border border-[#e6ebf8]"
                        : "hover:bg-[#f0f1f7] border border-transparent"
                    )}
                  >
                    {/* Company initials avatar */}
                    <span
                      className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[0.75rem] font-semibold text-white flex-shrink-0"
                      style={{ background: theme.sidebarHex }}
                    >
                      {theme.initials}
                    </span>

                    {/* Name + swatch */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[0.875rem] leading-[1.2] font-medium leading-[1.2]",
                        isActive ? "text-[#3c67ea]" : "text-[#242d48]"
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
                      <Check className="w-4 h-4 text-[#3c67ea] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-[#e6ebf8]/40 bg-[#f0f1f7]">
              <p className="text-[0.75rem] text-[#485478]">
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
      className="w-3.5 h-3.5 rounded-[2px] border border-[#e6ebf8] flex-shrink-0"
      style={{ background: hex }}
    />
  );
}
