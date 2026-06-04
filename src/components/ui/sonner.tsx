"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#242d48] group-[.toaster]:border-[#e6ebf8] group-[.toaster]:shadow-[0_2px_4px_rgba(36,45,72,0.15)]",
          description: "group-[.toast]:text-[#485478]",
          actionButton:
            "group-[.toast]:bg-[#3c67ea] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#f0f1f7] group-[.toast]:text-[#485478]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
