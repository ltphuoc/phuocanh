import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface InsetPanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export const InsetPanel = ({ children, className, ...props }: InsetPanelProps): ReactElement => (
  <div
    className={cn(
      'rounded-[var(--radius-panel)] border border-[#e8c8bf]/70 bg-[rgba(255,248,241,0.72)] p-4 shadow-none backdrop-blur-sm md:p-5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
