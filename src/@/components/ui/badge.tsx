import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'kalshi' | 'polymarket' | 'discord' | 'gmail' | 'teal' | 'muted'
}

function Badge({ className, variant = 'muted', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
        {
          'badge-kalshi': variant === 'kalshi',
          'badge-polymarket': variant === 'polymarket',
          'badge-discord': variant === 'discord',
          'badge-gmail': variant === 'gmail',
          'badge-teal': variant === 'teal',
          'bg-white/[0.06] text-white/50 border border-white/[0.08]': variant === 'muted',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
