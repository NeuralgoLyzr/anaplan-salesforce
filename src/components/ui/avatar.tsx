"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

// ADS Avatar: 40×40px, 33% border-radius (squircle), #485478 default bg, white text.
// ADS 9-color palette indexed 0-8 via data-color attribute.
// Focus: 2px dotted #596895.

// ADS avatar color palette (color-0 through color-8)
export const ADS_AVATAR_COLORS = [
  "#2bbdcb", // 0 — teal-pacifica
  "#413ea7", // 1 — purple-gigas
  "#eb4a62", // 2 — pink-frenchrose
  "#ffa437", // 3 — orange-carrot
  "#00a8ec", // 4 — blue-cerulean
  "#f7e64f", // 5 — yellow-energy
  "#00c8b2", // 6 — green-caribbean
  "#546775", // 7 — gray-shuttle
  "#b31c1c", // 8 — red-thunderbird
] as const

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    colorIndex?: number
  }
>(({ className, colorIndex, style, ...props }, ref) => {
  const bg = colorIndex !== undefined
    ? ADS_AVATAR_COLORS[colorIndex % ADS_AVATAR_COLORS.length]
    : "#485478"

  return (
    <AvatarPrimitive.Root
      ref={ref}
      style={{ backgroundColor: bg, ...style }}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden",
        "rounded-[33%]",                    // ADS: 33% border-radius (squircle)
        "border-2 border-dotted border-transparent",
        "focus:border-[#596895] focus:outline-none",   // ADS focus ring
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      // ADS: white text, 16px/600 (apple token), 33% radius, centers in parent
      "flex h-full w-full items-center justify-center",
      "rounded-[33%]",
      "text-white text-[1rem] font-semibold leading-[1.2]",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
