"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, style, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // after:-inset-y-* kept smaller than StylePanel's stacked-row gaps (gap-2.5/gap-3) so expanded
      // hit areas of adjacent switches never overlap; -inset-x-* can be generous since nothing sits beside it.
      "relative peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent ease-out-strong transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--border-hover)] after:absolute after:-inset-y-1 after:-inset-x-3 after:content-['']",
      className,
    )}
    ref={ref}
    style={style}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 ease-out-strong transition-transform duration-200 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
