import type { InputHTMLAttributes } from 'react';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ autoComplete, className, ...props }, ref) => (
    <input
      ref={ref}
      autoComplete={autoComplete ?? 'off'}
      className={cn(
        'h-12 w-full rounded-control border border-white/72 bg-white/78 px-4 text-sm text-foreground shadow-whisper backdrop-blur-md outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
