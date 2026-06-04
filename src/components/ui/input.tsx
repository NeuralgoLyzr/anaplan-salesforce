import * as React from "react"

import { cn } from "@/lib/utils"

// Anaplan Design System Input — exact ADS spec:
// 2px radius, #F8F8FA bg, box-shadow border (NOT CSS border), 8px padding.
// Font: 0.8125rem/13px, weight 400, #242D48.
// Border mechanism: shadow 0 0 0 1px #7885AB → 2px on hover.
// Focus: 2px dotted border #485478, shadow removed.
// Error: shadow 0 0 0 1px #DB3743 (set via aria-invalid or error class).
// Disabled: opacity 0.3.

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex w-full",
          "rounded-[2px]",
          "bg-[#f8f8fa]",
          "px-2 py-2",                          // ADS: 8px padding all sides
          "text-[0.8125rem] font-normal leading-[1.2] text-[#242d48]",
          // Border via box-shadow (ADS uses shadow, not CSS border)
          "border-2 border-dotted border-transparent",
          "shadow-[0_0_0_1px_#7885ab]",
          // Placeholder
          "placeholder:text-[#485478]",
          // Hover: thicker shadow
          "hover:shadow-[0_0_0_2px_#7885ab]",
          // Focus: dotted border #485478, shadow removed
          "focus:outline-none focus:border-[#485478] focus:shadow-none",
          // Error state via aria-invalid
          "aria-invalid:shadow-[0_0_0_1px_#db3743]",
          "aria-invalid:hover:shadow-[0_0_0_2px_#db3743]",
          "aria-invalid:focus:border-[#db3743] aria-invalid:focus:shadow-none",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-30",
          // File input
          "file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[#242d48]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
