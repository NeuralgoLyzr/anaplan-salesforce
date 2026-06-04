// Anaplan Design System — Loader
// Exact implementation from ADS Storybook: /docs/display-loader--docs
//
// Structure: outer wrapper rotates all at 2s linear.
//   Disc 1 (child 1): full ring SVG, opacity 0.15 — static background
//   Disc 2 (child 2): arc SVG, opacity 0.50 — loader-rotate-first 1.5s ease-in-out
//   Disc 3 (child 3): arc SVG, opacity 0.75 — loader-rotate-second 1.5s ease-in-out
//
// Sizes: default=64px | medium=48px | small=32px | inline=16px
// Color: runtime = #3C67EA (blue-mariner) | builder = #00CCB5 (green-jungle)
// Text: apple token — 16px/600/#242D48, centered below the discs.

import * as React from "react"
import { cn } from "@/lib/utils"

// ── Exact sizes from ADS source ────────────────────────────────────────────
const ADS_SIZE_PX: Record<string, number> = {
  default: 64,
  medium:  48,
  small:   32,
  inline:  16,
}

// ADS SVG paths — extracted 1:1 from compiled Storybook JS
// Disc 1: full donut ring (background)
const RING_PATH =
  "M32,64 C49.673112,64 64,49.673112 64,32 C64,14.326888 49.673112,0 32,0 C14.326888,0 0,14.326888 0,32 C0,49.673112 14.326888,64 32,64 Z M32,60 C47.463973,60 60,47.463973 60,32 C60,16.536027 47.463973,4 32,4 C16.536027,4 4,16.536027 4,32 C4,47.463973 16.536027,60 32,60 Z"

// Discs 2 & 3: partial arc (~3/4 circle spinner)
const ARC_PATH =
  "M32,0 C14.326888,0 0,14.326888 0,32 C0,32.6394653 0.0187568455,33.2745497 0.0557503724,33.9047331 C0.184632347,34.6942808 0.611302752,36.0226237 2.0234375,36.0226237 C4.03271484,36.0226237 4,33.3333333 4,33.3333333 L4.03118694,33.3333333 C4.01047298,32.8914897 4,32.4469679 4,32 C4,16.536027 16.536027,4 32,4 L32,3.93294271 C32,3.93294271 34.750651,3.95442708 34.6666667,2 C34.750651,0.06640625 32,0.0621744792 32,0.0621744792 L32,-3.6429193e-16 Z"

export type LoaderSize = "default" | "medium" | "small" | "inline"

// backward-compat: old variant prop names → LoaderSize
const VARIANT_MAP: Record<string, LoaderSize> = {
  default: "default",
  medium:  "medium",
  small:   "small",
  inline:  "inline",
  large:   "default",   // old "large" → ADS default (64px)
  builder: "default",   // old "builder" → ADS default (64px)
}

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: LoaderSize
  /** Text shown below the spinner (apple token: 16px/600/#242D48) */
  text?: string
  /** runtime = #3C67EA blue | builder = #00CCB5 teal */
  mode?: "runtime" | "builder"
  screenReaderLabel?: string
}

export function Loader({
  size = "medium",
  text,
  mode = "runtime",
  screenReaderLabel,
  className,
  ...props
}: LoaderProps) {
  const resolvedSize: LoaderSize = VARIANT_MAP[size] ?? size
  const px = ADS_SIZE_PX[resolvedSize]
  const fill = mode === "runtime" ? "#3c67ea" : "#00ccb5"

  // Inline variant: display inline, no margin, static
  const isInline = resolvedSize === "inline"

  const discs = (
    // outer container — rotates all discs at 2s linear (loader-rotate-all)
    <div
      style={{
        display:  "inline-block",
        position: "relative",
        width:    px,
        height:   px,
        animation: "ads-loader-rotate-all 2s linear infinite",
      }}
      aria-hidden="true"
    >
      {/* Disc 1 — full ring, opacity 0.15, no extra animation */}
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        style={{ position: "absolute", top: 0, left: 0, fill, opacity: 0.15 }}
      >
        <path d={RING_PATH} stroke="none" fillRule="evenodd" />
      </svg>

      {/* Disc 2 — arc, opacity 0.50, loader-rotate-first 1.5s ease-in-out */}
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        style={{
          position: "absolute", top: 0, left: 0, fill, opacity: 0.50,
          animation: "ads-loader-rotate-first 1.5s ease-in-out infinite",
        }}
      >
        <path d={ARC_PATH} stroke="none" fillRule="evenodd" />
      </svg>

      {/* Disc 3 — arc, opacity 0.75, loader-rotate-second 1.5s ease-in-out */}
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        style={{
          position: "absolute", top: 0, left: 0, fill, opacity: 0.75,
          animation: "ads-loader-rotate-second 1.5s ease-in-out infinite",
        }}
      >
        <path d={ARC_PATH} stroke="none" fillRule="evenodd" />
      </svg>
    </div>
  )

  // ── Inline variant (no wrapper, no text) ──────────────────────────────
  if (isInline) {
    return (
      <span
        role="status"
        aria-label={screenReaderLabel ?? "Loading"}
        className={cn("inline-flex", className)}
        style={{ margin: "0 4px", verticalAlign: "middle" }}
        {...props}
      >
        {discs}
        {screenReaderLabel && (
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
            {screenReaderLabel}
          </span>
        )}
      </span>
    )
  }

  // ── Standard variant ─────────────────────────────────────────────────
  return (
    <div
      role="status"
      aria-label={screenReaderLabel ?? "Loading"}
      className={cn(
        "flex flex-col items-center justify-center",
        className
      )}
      {...props}
    >
      <div style={{ display: "inline-block", margin: 8, position: "relative" }}>
        {discs}
      </div>

      {/* Text: apple token — 16px/600/#242D48, centered below */}
      {text && (
        <span
          className="text-[1rem] font-semibold leading-[1.2] text-[#242d48]"
          style={{ marginTop: 8 }}
        >
          {text}
        </span>
      )}

      {screenReaderLabel && (
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
          {screenReaderLabel}
        </span>
      )}
    </div>
  )
}

// ── Convenience wrappers ───────────────────────────────────────────────────

/** Centered overlay — covers parent with solid white background */
export function LoaderOverlay({ text, size = "default" }: { text?: string; size?: LoaderSize }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
      <Loader size={size} text={text} />
    </div>
  )
}

/** Page-level centered loader for route loading states */
export function LoaderPage({ text }: { text?: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      <Loader size="medium" text={text} />
    </div>
  )
}
