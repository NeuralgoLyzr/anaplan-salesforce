// Anaplan Design System — PageHeader / SiteHeader
// Spec: 56px height, white bg, 1px solid #E6EBF8 border-bottom.
// Grid: "back header actions" — min-content 1fr auto.
// Title font: grapefruit — 22px/600/#242D48, line-height 1.5.

import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Root PageHeader ────────────────────────────────────────────────────────
interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  backSlot?: React.ReactNode
  actionsSlot?: React.ReactNode
}

export function SiteHeader({
  backSlot,
  actionsSlot,
  children,
  className,
  ...props
}: SiteHeaderProps) {
  return (
    <header
      style={{
        display: "grid",
        gridTemplateAreas: "'back header actions'",
        gridTemplateColumns: "min-content 1fr auto",
        alignItems: "center",
      }}
      className={cn(
        "w-full h-[56px] bg-white border-b border-[#e6ebf8] px-4",
        className
      )}
      {...props}
    >
      {backSlot && (
        <div style={{ gridArea: "back" }} className="mr-2 flex items-center">
          {backSlot}
        </div>
      )}
      <div style={{ gridArea: "header" }} className="flex items-center min-w-0 pr-4">
        {children}
      </div>
      {actionsSlot && (
        <div style={{ gridArea: "actions" }} className="flex items-center gap-2">
          {actionsSlot}
        </div>
      )}
    </header>
  )
}

// ADS PageHeader title: grapefruit — 22px/600, #242D48, line-height 1.5
export function PageHeaderTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-[1.375rem] font-semibold leading-[1.5] text-[#242d48] truncate pr-2",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

// ADS breadcrumb: cranberry — 13px/400, #485478
export function PageHeaderBreadcrumb({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-[0.8125rem] font-normal text-[#485478] leading-[1.2]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
