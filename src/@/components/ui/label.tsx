import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1.5 leading-none",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
