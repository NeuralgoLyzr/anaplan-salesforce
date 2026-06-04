"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[4px] text-[0.875rem] leading-[1.2] font-medium hover:bg-[#f0f1f7] hover:text-[#485478] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[#e6ebf8] data-[state=on]:text-[#242d48] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-[#596895] focus-visible:ring-[#596895] focus-visible:ring-[2px] outline-none transition-[color,box-shadow] aria-invalid:border-[#db3743] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        // ADS outline toggle: uses same box-shadow spec as Input border
        outline:
          "bg-transparent shadow-[0_0_0_1px_#7885ab] hover:shadow-[0_0_0_2px_#7885ab] hover:bg-[#e6ebf8] hover:text-[#242d48]",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
