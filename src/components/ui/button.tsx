import type { ButtonHTMLAttributes, ReactElement } from 'react';
import type { VariantProps } from 'tailwind-variants';

import { tv } from 'tailwind-variants';

import { cn } from '@/lib/utils/cn';

const buttonVariants = tv({
  base: 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill text-sm font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-200 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55',
  variants: {
    size: {
      default: 'h-12 px-5',
      icon: 'size-12',
      sm: 'h-11 px-4 text-xs',
    },
    variant: {
      ghost: 'bg-transparent text-foreground hover:bg-white/62',
      outline:
        'border border-white/72 bg-white/70 text-foreground shadow-whisper backdrop-blur-md hover:-translate-y-0.5 hover:bg-white/88',
      primary:
        'ui-gradient-active text-primary-foreground shadow-cloud hover:-translate-y-0.5 hover:brightness-105',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'primary',
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  readonly busyLabel?: string;
  readonly isBusy?: boolean;
}

export const Button = ({
  'aria-busy': ariaBusyProp,
  busyLabel,
  children,
  className,
  disabled,
  isBusy = false,
  size,
  type,
  variant,
  ...props
}: ButtonProps): ReactElement => (
  // Destructure `aria-busy`/`disabled`/`type` out of `props` so the trailing
  // spread can't clobber the controlled values below (e.g. an `isBusy` button
  // must stay disabled even if a caller also passes `disabled={false}`).
  <button
    {...props}
    aria-busy={isBusy || ariaBusyProp || undefined}
    className={cn(buttonVariants({ size, variant }), className)}
    disabled={isBusy || disabled}
    type={type ?? 'button'}
  >
    {isBusy ? (
      <>
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
        {busyLabel ?? children}
      </>
    ) : (
      children
    )}
  </button>
);
