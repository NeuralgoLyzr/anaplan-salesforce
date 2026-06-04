"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// ADS Checkbox: 16×16px, 2px radius, 1px solid #485478 border, #3C67EA checked bg.
// Focus: outline 2px dotted #485478 (not a ring). Disabled: opacity 0.5.
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0",
      "rounded-[2px]",
      "border border-[#485478] bg-white",
      "transition-colors duration-200 ease-out",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-[#485478]",
      "data-[state=checked]:bg-[#3c67ea] data-[state=checked]:border-[#3c67ea] data-[state=checked]:text-white",
      "data-[state=indeterminate]:bg-[#3c67ea] data-[state=indeterminate]:border-[#3c67ea] data-[state=indeterminate]:text-white",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
