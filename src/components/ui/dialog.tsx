"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

// ADS Modal overlay: rgba(36,45,72,0.7) — neutral-martinique 70%
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      "bg-[rgba(36,45,72,0.7)]",   // ADS backdrop
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// ADS Modal content: 4px radius, white bg, L2 shadow, max-w 820px, p-10 overlay
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50",
        "w-full max-w-[820px]",              // ADS default modal max-width
        "translate-x-[-50%] translate-y-[-50%]",
        "flex flex-col overflow-hidden",
        "rounded-[4px]",                     // ADS medium radius
        "bg-white text-[#242d48]",
        "shadow-[0_4px_8px_rgba(36,45,72,0.20)]",  // ADS L2 elevation
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      {/* ADS close button: icon button style, #485478 */}
      <DialogPrimitive.Close className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[2px] text-[#485478] opacity-70 transition-all hover:bg-[#f0f1f7] hover:opacity-100 focus:outline-none focus:outline-dotted focus:outline-2 focus:outline-[#485478] disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// ADS Modal header: padding 16px 8px 16px 16px, border-bottom #E6EBF8
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center flex-wrap justify-end",
      "px-4 py-4 pr-8",                   // ADS: 16px 8px 16px 16px (leave room for close btn)
      "border-b border-[#e6ebf8]",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

// ADS Modal footer: border-top #E6EBF8, padding 16px, flex end
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2",
      "p-4 border-t border-[#e6ebf8]",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

// ADS Modal body: kiwi 14px/400, padding 0 16px 16px
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto",
      "px-4 pb-4 pt-0",                   // ADS body: 0 16px 16px
      "text-[0.875rem] font-normal leading-[1.2] text-[#242d48]",
      className
    )}
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

// ADS Modal title: banana 18px/600, #242D48
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "mr-auto",
      "text-[1.125rem] font-semibold leading-[1.2] text-[#242d48]",  // banana token
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// ADS description: kiwi 14px/400, #485478
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[0.875rem] font-normal text-[#485478] leading-[1.2]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
