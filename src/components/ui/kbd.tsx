import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface KbdProps extends HTMLAttributes<HTMLElement> {}

const Kbd = forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => {
  return (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground border border-border rounded",
        "shadow-sm min-w-[1.5rem]",
        className
      )}
      {...props}
    />
  );
});
Kbd.displayName = "Kbd";

export { Kbd };