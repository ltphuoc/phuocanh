import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type ResponsiveGridColumns = 1 | 2 | 3;

interface ResponsiveGridProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly columns?: ResponsiveGridColumns;
  readonly density?: 'comfortable' | 'compact';
}

const getGridColumnsClass = (columns: ResponsiveGridColumns): string => {
  switch (columns) {
    case 3:
      return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 1:
    default:
      return 'grid-cols-1';
  }
};

export const ResponsiveGrid = ({
  children,
  className,
  columns = 2,
  density = 'comfortable',
  ...props
}: ResponsiveGridProps): ReactElement => (
  <div
    className={cn(
      'grid',
      density === 'comfortable' ? 'gap-4 md:gap-5 lg:gap-6' : 'gap-3 md:gap-4 lg:gap-5',
      getGridColumnsClass(columns),
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
