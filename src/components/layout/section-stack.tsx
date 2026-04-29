import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface SectionStackProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly density?: 'comfortable' | 'compact';
}

export const SectionStack = ({
  children,
  className,
  density = 'comfortable',
  ...props
}: SectionStackProps): ReactElement => (
  <div
    className={cn(
      'flex flex-col',
      density === 'comfortable' ? 'gap-8 md:gap-10 lg:gap-12' : 'gap-4 md:gap-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
