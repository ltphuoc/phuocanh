import type { HTMLAttributes, ReactElement } from 'react';
import type { VariantProps } from 'tailwind-variants';

import { tv } from 'tailwind-variants';

import { cn } from '@/lib/utils/cn';

const badgeVariants = tv({
  base: 'inline-flex min-h-8 items-center rounded-pill border px-3 py-1 text-xs font-semibold tracking-[0.08em] uppercase backdrop-blur-md',
  variants: {
    variant: {
      neutral: 'border-white/65 bg-white/60 text-muted-foreground',
      primary: 'border-primary/15 bg-primary/16 text-foreground',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ children, className, variant, ...props }: BadgeProps): ReactElement => (
  <div
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  >
    {children}
  </div>
);
