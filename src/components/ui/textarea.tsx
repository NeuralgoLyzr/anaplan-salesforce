import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // ADS Textarea spec (identical to Input): 2px radius, #F8F8FA bg,
        // box-shadow border #7885AB (not CSS border), 13px/400, 8px padding.
        // Hover: shadow 2px. Focus: dotted border #485478, shadow removed.
        "flex min-h-[60px] w-full",
        "rounded-[2px]",
        "border-2 border-dotted border-transparent",
        "bg-[#f8f8fa]",
        "px-2 py-2",
        "text-[0.8125rem] font-normal leading-[1.2] text-[#242d48]",
        "shadow-[0_0_0_1px_#7885ab]",
        "placeholder:text-[#485478]",
        "hover:shadow-[0_0_0_2px_#7885ab]",
        "focus:outline-none focus:border-[#485478] focus:shadow-none",
        "aria-invalid:shadow-[0_0_0_1px_#db3743] aria-invalid:hover:shadow-[0_0_0_2px_#db3743]",
        "disabled:cursor-not-allowed disabled:opacity-30",
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
