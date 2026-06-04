import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface InsetPanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export const InsetPanel = ({ children, className, ...props }: InsetPanelProps): ReactElement => (
  <div
    className={cn(
      'rounded-panel border border-stroke-soft/70 bg-card p-4 shadow-none md:p-5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
