"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// Anaplan Design System Tabs — exact ADS spec:
// TabsList: transparent, flush border-bottom #E6EBF8. No pill container.
// Inactive: 14px/400/kiwi, #485478.
// Active: 14px/600/pear, #242D48, 2px solid #3C67EA bottom border indicator.
// Padding: 8px 16px. Radius: 2px.

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center border-b border-[#e6ebf8]",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap",
      "rounded-[2px] px-4 py-2",
      "text-[0.875rem] font-normal leading-[1.2] text-[#485478]",
      "transition-all duration-200 ease-out outline-none",
      // Active: pear 14px/600, navy, 2px blue bottom indicator
      "data-[state=active]:font-semibold data-[state=active]:text-[#242d48]",
      "data-[state=active]:border-b-2 data-[state=active]:border-[#3c67ea] data-[state=active]:mb-[-1px]",
      "focus-visible:outline-dotted focus-visible:outline-2 focus-visible:outline-[#485478]",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 outline-none",
      "focus-visible:outline-dotted focus-visible:outline-2 focus-visible:outline-[#485478]",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
