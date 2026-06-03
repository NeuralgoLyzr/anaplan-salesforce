import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Anaplan Design System button — 2px radius, weight 600, .2px tracking,
// interactive blue #3c67ea → hover #1947ba → active #0b2265.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-semibold tracking-[0.2px] leading-tight transition-all duration-200 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[#1947ba] active:bg-[#0b2265]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[#b22435] active:bg-[#801a26]",
        outline:
          "bg-transparent text-primary shadow-[inset_0_0_0_1px_#3c67ea] hover:text-[#1947ba] hover:shadow-[inset_0_0_0_2px_#1947ba] active:text-[#0b2265] active:shadow-[inset_0_0_0_2px_#0b2265]",
        secondary:
          "bg-muted text-foreground hover:bg-accent",
        ghost: "text-primary hover:bg-muted hover:text-[#1947ba] active:bg-border active:text-[#0b2265]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8 text-base",
        icon: "h-9 w-9 p-0",
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
