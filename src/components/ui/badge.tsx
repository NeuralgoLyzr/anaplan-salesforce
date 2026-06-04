import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Anaplan Design System Badge — exact ADS spec:
// 2px radius, 12px/500/UPPERCASE, padding 0 4px.
// Default: outlined — border + text = #242D48.
// Success: bg + border = #14A687, white text.
// Warning: bg + border = #FFBB16, navy text.
// Danger: bg + border = #DB3743, white text.
// Info: bg + border = #3C67EA, white text.

const badgeVariants = cva(
  [
    "inline-flex items-center",
    "rounded-[2px]",
    "px-1 py-0",                    // ADS: padding 0 4px
    "text-[0.75rem] font-medium",   // blueberry: 12px, weight 500
    "uppercase",                    // ADS: text-transform uppercase
    "leading-[1.2]",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        // ADS default badge: outlined
        default:
          "border border-[#242d48] text-[#242d48] bg-transparent",
        // ADS success / teal fill
        success:
          "border border-[#14a687] bg-[#14a687] text-white",
        // ADS warning
        warning:
          "border border-[#ffbb16] bg-[#ffbb16] text-[#242d48]",
        // ADS danger
        destructive:
          "border border-[#db3743] bg-[#db3743] text-white",
        // ADS info / primary fill
        primary:
          "border border-[#3c67ea] bg-[#3c67ea] text-white",
        // ADS secondary (outlined slate)
        secondary:
          "border border-[#485478] text-[#485478] bg-transparent",
        // Outline alias (same as default)
        outline:
          "border border-[#242d48] text-[#242d48] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
