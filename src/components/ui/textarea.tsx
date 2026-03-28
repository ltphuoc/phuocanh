import type { ReactElement, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({
  className,
  ...props
}: TextareaProps): ReactElement => (
  <textarea
    className={cn(
      "min-h-32 w-full rounded-[1.35rem] border border-white/70 bg-white/76 px-4 py-3.5 text-sm text-foreground shadow-whisper outline-none backdrop-blur-md placeholder:text-muted-foreground focus:border-primary focus:shadow-glow focus:ring-2 focus:ring-ring/30",
      className,
    )}
    {...props}
  />
);
