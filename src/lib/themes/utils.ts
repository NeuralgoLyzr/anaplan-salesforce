export function hexToHslParts(hex: string): { h: number; s: number; l: number } {
  if (!hex || typeof hex !== "string") {
    return { h: 0, s: 0, l: 0 };
  }
  const raw = hex.replace("#", "");
  // Fallback if hex string is malformed
  if (raw.length < 6) {
    return { h: 0, s: 0, l: 0 };
  }
  
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslStr(h: number, s: number, l: number): string {
  return `${h} ${Math.max(0, Math.min(100, Math.round(s)))}% ${Math.max(0, Math.min(100, Math.round(l)))}%`;
}

export function hexToHslStr(hex: string): string {
  if (!hex || typeof hex !== "string") {
    return "0 0% 0%";
  }
  // Smart check: If it is already a space-separated HSL string, return it directly
  if (hex.includes(" ") && !hex.includes("#")) {
    return hex;
  }
  const { h, s, l } = hexToHslParts(hex);
  return hslStr(h, s, l);
}

/**
 * Calculates the relative luminance of a color for WCAG contrast calculations.
 */
function getLuminance(hex: string): number {
  if (!hex || typeof hex !== "string") {
    return 0;
  }
  const rgb = hex.replace("#", "");
  if (rgb.length < 6) return 0;
  
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;

  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates WCAG 2.1 Contrast Ratio between two hex colors.
 * Returns a number between 1 and 21 (e.g. 4.5).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

import type { Theme } from "./registry";

export function generateThemeVars(theme: Omit<Theme, "vars">): Record<string, string> {
  const p = hexToHslParts(theme.primaryHex);

  // Fallbacks if optional semantic colors are missing
  const success = theme.successHex || "#16A34A";
  const warning = theme.warningHex || "#F59E0B";
  const error = theme.errorHex || "#DC2626";
  const info = theme.infoHex || "#0EA5E9";
  const accent = theme.accentHex || theme.primaryHex;
  const gradientEnd = theme.gradientEndHex || theme.primaryHex;

  const bg = theme.backgroundHex || "#FAF7F5";
  const card = theme.cardHex || "#FFFFFF";
  const border = theme.borderHex || "#E7DED4";

  // Derive foreground and muted text colors from primary to maintain natural visual cohesion
  const fgS = Math.min(p.s * 0.15, 18);
  const textPrimary = theme.textPrimaryHex || hslStr(p.h, fgS, 13);
  const textSecondary = theme.textSecondaryHex || hslStr(p.h, Math.min(p.s * 0.12, 12), 48);

  // Primary foreground calculation (contrast check to keep text readable)
  const isPrimaryLight = hexToHslParts(theme.primaryHex).l > 65;
  const primaryFg = isPrimaryLight ? "0 0% 10%" : "0 0% 100%";

  // Density maps: padding and gaps coefficients
  let densityPadding = "0.75rem";
  let densityGap = "1rem";
  if (theme.density === "compact") {
    densityPadding = "0.45rem";
    densityGap = "0.6rem";
  } else if (theme.density === "spacious") {
    densityPadding = "1.25rem";
    densityGap = "1.5rem";
  }

  // Shadow variables based on elevation intensity
  const shadowColor = `${p.h} ${p.s}% ${Math.max(10, p.l - 15)}%`;
  let shadowOpacity = "0.03";
  let shadowIntensityClass = "0 1px 4px rgba(0,0,0,0.02)";
  if (theme.motion === "premium" || theme.id !== "deloitte") {
    shadowOpacity = "0.08";
    shadowIntensityClass = "0 4px 16px hsla(" + shadowColor + ", 0.08)";
  }

  // Sidebar styling depending on variant setting
  let sidebarBg = hexToHslStr(theme.sidebarHex);
  let sidebarFg = "0 0% 92%";
  let sidebarBorder = hexToHslStr(theme.sidebarHex);
  let sidebarAccent = hexToHslStr(theme.sidebarHex);
  let sidebarAccentFg = "0 0% 100%";

  const sbHsl = hexToHslParts(theme.sidebarHex);
  if (theme.sidebarVariant === "light" || sbHsl.l > 60) {
    sidebarBg = hexToHslStr(theme.sidebarHex);
    sidebarFg = "215 25% 15%";
    sidebarBorder = hslStr(sbHsl.h, sbHsl.s, Math.max(10, sbHsl.l - 8));
    sidebarAccent = hslStr(sbHsl.h, sbHsl.s, Math.max(10, sbHsl.l - 12));
    sidebarAccentFg = "215 25% 10%";
  } else if (theme.sidebarVariant === "transparent") {
    sidebarBg = "0 0% 100% / 0%";
    sidebarFg = textPrimary;
    sidebarBorder = hexToHslStr(border);
    sidebarAccent = hexToHslStr(theme.primaryHex) + " / 10%";
    sidebarAccentFg = hexToHslStr(theme.primaryHex);
  } else if (theme.sidebarVariant === "glassmorphic") {
    sidebarBg = "255 255 255 / 40%";
    sidebarFg = textPrimary;
    sidebarBorder = "255 255 255 / 20%";
    sidebarAccent = hexToHslStr(theme.primaryHex) + " / 10%";
    sidebarAccentFg = hexToHslStr(theme.primaryHex);
  }

  // Typography font selections
  let fontSansVar = "'Inter', system-ui, sans-serif";
  let fontHeadingVar = "'Playfair Display', Georgia, serif";
  const fontMonoVar = "'JetBrains Mono', monospace";

  if (theme.fontFamily === "Segoe UI") {
    fontSansVar = "'Segoe UI', system-ui, sans-serif";
    fontHeadingVar = "'Segoe UI', system-ui, sans-serif";
  } else if (theme.fontFamily === "Roboto") {
    fontSansVar = "'Roboto', system-ui, sans-serif";
    fontHeadingVar = "'Roboto', system-ui, sans-serif";
  } else if (theme.fontFamily === "IBM Plex Sans") {
    fontSansVar = "'IBM Plex Sans', system-ui, sans-serif";
    fontHeadingVar = "'IBM Plex Sans', system-ui, sans-serif";
  } else if (theme.fontFamily === "System-UI") {
    fontSansVar = "system-ui, sans-serif";
    fontHeadingVar = "system-ui, sans-serif";
  }

  // Animation motion controls
  let transitionDuration = "0.2s";
  if (theme.motion === "none") {
    transitionDuration = "0s";
  } else if (theme.motion === "reduced") {
    transitionDuration = "0.1s";
  } else if (theme.motion === "premium") {
    transitionDuration = "0.35s";
  }

  return {
    "--background":                   hexToHslStr(bg),
    "--foreground":                   hexToHslStr(textPrimary),
    "--card":                         hexToHslStr(card),
    "--card-foreground":              hexToHslStr(textPrimary),
    "--popover":                      hexToHslStr(card),
    "--popover-foreground":           hexToHslStr(textPrimary),
    
    "--primary":                      hexToHslStr(theme.primaryHex),
    "--primary-foreground":           primaryFg,
    
    "--secondary":                    hexToHslStr(theme.accentHex),
    "--secondary-foreground":         "0 0% 100%",
    
    "--muted":                        hslStr(p.h, Math.min(p.s * 0.1, 10), 93),
    "--muted-foreground":             hexToHslStr(textSecondary),
    
    "--accent":                       hslStr(p.h, p.s, Math.max(p.l - 14, 8)),
    "--accent-foreground":            "0 0% 100%",
    
    "--destructive":                  hexToHslStr(error),
    "--destructive-foreground":       "0 0% 100%",
    
    "--success":                      hexToHslStr(success),
    "--success-foreground":           "0 0% 100%",
    
    "--warning":                      hexToHslStr(warning),
    "--warning-foreground":           "0 0% 10%",
    
    "--border":                       hexToHslStr(border),
    "--input":                        hexToHslStr(border),
    "--ring":                         hexToHslStr(theme.primaryHex),
    
    "--radius":                       theme.radius || "0.5rem",
    
    // Sidebar properties
    "--sidebar":                      sidebarBg,
    "--sidebar-foreground":           sidebarFg,
    "--sidebar-primary":              hexToHslStr(theme.primaryHex),
    "--sidebar-primary-foreground":   "0 0% 100%",
    "--sidebar-accent":               sidebarAccent,
    "--sidebar-accent-foreground":    sidebarAccentFg,
    "--sidebar-border":               sidebarBorder,
    "--sidebar-ring":                 hexToHslStr(theme.primaryHex),
    
    // Expanded Enterprise layout/motion/fonts Custom Properties
    "--primary-gradient-start":       hexToHslStr(theme.primaryHex),
    "--primary-gradient-end":         hexToHslStr(gradientEnd),
    "--accent-highlight":             hexToHslStr(accent),
    "--font-sans-custom":             fontSansVar,
    "--font-heading-custom":          fontHeadingVar,
    "--font-mono-custom":             fontMonoVar,
    "--density-padding":              densityPadding,
    "--density-gap":                  densityGap,
    "--transition-duration":          transitionDuration,
    "--shadow-intensity-class":       shadowIntensityClass,
    "--shadow-glow-opacity":          shadowOpacity,
    
    // Charts Palette maps
    "--chart-1":                      hexToHslStr(theme.primaryHex),
    "--chart-2":                      hexToHslStr(accent),
    "--chart-3":                      hexToHslStr(gradientEnd),
    "--chart-4":                      hexToHslStr(success),
    "--chart-5":                      hexToHslStr(info),
  };
}
