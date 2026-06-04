import type { ReactElement, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ autoComplete, className, ...props }: SelectProps): ReactElement => (
  <select
    autoComplete={autoComplete ?? 'off'}
    className={cn(
      'h-12 w-full rounded-control border border-white/72 bg-white/78 px-3 text-sm text-foreground shadow-whisper transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30',
      className,
    )}
    {...props}
  />
);
