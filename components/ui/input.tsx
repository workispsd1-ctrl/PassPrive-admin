import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // BASE
        "file:text-foreground selection:bg-primary selection:text-primary-foreground",
        "dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1",
        "text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",

        // FIX: ADD TEXT & PLACEHOLDER COLOR
        "text-gray-900 placeholder:text-gray-400",

        // FIX: INDIGO FOCUS COLOR
        "focus-visible:ring-1 focus-visible:ring-indigo-800 focus-visible:ring-offset-0",

        // STATES
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

        // ERROR STATE SUPPORT
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",

        className
      )}
      {...props}
    />
  );
}

export { Input };
