import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Anaplan Design System button — exact ADS spec:
// 2px radius, 14px/600/1.2 typography, 0.2px tracking, 8px×16px padding.
// Primary: #3C67EA → hover #1947BA → active #0B2265.
// Secondary (outline): inset shadow border, 1px→2px on hover.
// Ghost (ADS "default" text btn): transparent bg, signature color text.
// Focus: 1px solid #596895 outline (after pseudo), not a ring.
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[2px] text-[0.875rem] font-semibold tracking-[0.2px] leading-[1.2]",
    "transition-all duration-200 ease-out",
    "outline-none",
    // ADS focus: 1px solid #596895 border drawn with after pseudo
    "focus-visible:after:absolute focus-visible:after:inset-[-2px]",
    "focus-visible:after:rounded-[2px] focus-visible:after:border focus-visible:after:border-[#596895]",
    "focus-visible:after:pointer-events-none focus-visible:after:content-['']",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // ADS Primary button
        default:
          "bg-[#3c67ea] text-white hover:bg-[#1947ba] active:bg-[#0b2265]",
        // ADS Danger (filled)
        destructive:
          "bg-[#db3743] text-white hover:bg-[#b22435] active:bg-[#801a26]",
        // ADS Secondary (outline inset shadow)
        outline:
          "bg-transparent text-[#3c67ea] shadow-[inset_0_0_0_1px_#3c67ea]" +
          " hover:bg-[#f0f1f7] hover:text-[#1947ba] hover:shadow-[inset_0_0_0_2px_#1947ba]" +
          " active:bg-[#dfe2eb] active:text-[#0b2265] active:shadow-[inset_0_0_0_2px_#0b2265]",
        // ADS Secondary Danger (outline inset)
        "outline-danger":
          "bg-transparent text-[#db3743] shadow-[inset_0_0_0_1px_#db3743]" +
          " hover:text-[#b22435] hover:shadow-[inset_0_0_0_2px_#b22435]" +
          " active:text-[#801a26] active:shadow-[inset_0_0_0_2px_#801a26]",
        // ADS Ghost / default text button
        ghost:
          "text-[#3c67ea] hover:bg-[#f0f1f7] hover:text-[#1947ba] active:bg-[#dfe2eb] active:text-[#0b2265]",
        // ADS Icon button
        icon:
          "text-[#485478] hover:bg-[#f0f1f7] active:bg-[#dfe2eb]",
        // Link style
        link: "text-[#3c67ea] underline-offset-4 hover:underline",
        // Generic secondary (muted bg) — kept for shadcn compat
        secondary:
          "bg-[#f0f1f7] text-[#242d48] hover:bg-[#dfe2eb]",
      },
      size: {
        default: "py-2 px-4",          // ADS: 8px 16px
        sm: "py-1 px-3 text-[13px]",
        lg: "py-2.5 px-4 text-[16px]",
        icon: "h-8 w-8 p-0",          // ADS icon button: 32px
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
