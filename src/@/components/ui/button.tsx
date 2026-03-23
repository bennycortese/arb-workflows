import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Solid teal — primary CTA
        primary:
          "bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_28px_rgba(6,182,212,0.5)]",
        // Outlined — secondary actions
        outline:
          "border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.15]",
        // Ghost — subtle
        ghost:
          "text-white/50 hover:text-white hover:bg-white/[0.05]",
        // Destructive
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        // Nav link style
        nav:
          "text-white/50 hover:text-white hover:bg-white/[0.05] rounded-lg",
        // Kalshi green
        kalshi:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30",
        // Polymarket blue
        polymarket:
          "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "outline",
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
