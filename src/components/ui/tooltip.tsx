"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

// ADS Tooltip: bg #485478, white text, 2px radius, 13px/600, 8px×16px padding, L1 shadow, 12px offset
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 12, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden",
        "rounded-[2px]",
        "bg-[#485478] text-white",
        "px-4 py-2",
        "text-[0.8125rem] font-semibold leading-[1.2]",
        "shadow-[0_2px_4px_rgba(36,45,72,0.15)]",
        "animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "origin-(--radix-tooltip-content-transform-origin)",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
