import type { ReactElement, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ autoComplete, className, ...props }: SelectProps): ReactElement => (
  <select
    autoComplete={autoComplete ?? 'off'}
    className={cn(
      'h-11 w-full rounded-2xl border border-border bg-card/95 px-3 text-sm text-foreground transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25',
      className,
    )}
    {...props}
  />
);
