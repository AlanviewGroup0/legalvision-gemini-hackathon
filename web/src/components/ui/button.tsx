import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none text-base font-medium min-h-[44px] min-w-[44px] ring-offset-brutal-section transition-transform duration-150 ease-out gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brutal-border focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-brutal-text bg-brutal-button border-2 border-brutal-border hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-button",
        neutral:
          "text-brutal-text bg-brutal-section border-2 border-brutal-border hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-button",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-11 px-4 py-2 min-w-0",
        lg: "h-12 px-8 py-3",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
