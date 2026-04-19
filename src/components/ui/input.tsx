import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-control border border-white/70 bg-white/76 px-4 text-sm text-foreground shadow-whisper outline-none backdrop-blur-md placeholder:text-muted-foreground focus:border-primary focus:shadow-glow focus:ring-2 focus:ring-ring/30",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
