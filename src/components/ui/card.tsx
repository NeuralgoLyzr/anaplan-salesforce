import * as React from "react"

import { cn } from "@/lib/utils"

// Anaplan Design System Card — exact ADS spec:
// 4px radius, white bg, 1px solid #E6EBF8 border, L1 shadow.
// Header: 16px padding, flex row, space-between.
// Body: 0 16px 16px padding.
// Footer: 16px padding, flex row.
// subtle prop: border only, no shadow (ADS subtle variant).

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { subtle?: boolean }
>(({ className, subtle = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[4px] bg-white text-[#242d48] w-full border border-[#e6ebf8]",
      subtle
        ? ""
        : "shadow-[0_2px_4px_rgba(36,45,72,0.15)]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // ADS: apple token — 1rem/16px, weight 600, line-height 1.2, no tracking
    className={cn(
      "text-[1rem] font-semibold leading-[1.2] text-[#242d48] overflow-hidden text-ellipsis whitespace-nowrap",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // ADS: kiwi token — 0.875rem/14px, weight 400, #485478
    className={cn("text-[0.875rem] font-normal leading-[1.2] text-[#485478]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // ADS body padding: 0 16px 16px
  <div ref={ref} className={cn("px-4 pb-4", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // ADS footer: 16px padding, flex row
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
