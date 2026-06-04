import type { ReactElement, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ autoComplete, className, ...props }: TextareaProps): ReactElement => (
  <textarea
    autoComplete={autoComplete ?? 'off'}
    className={cn(
      'min-h-32 w-full rounded-[var(--radius-control)] border border-white/72 bg-white/78 px-4 py-3.5 text-sm text-foreground shadow-whisper backdrop-blur-md outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30',
      className,
    )}
    {...props}
  />
);
