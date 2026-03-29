import type { ButtonHTMLAttributes, ReactElement } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils/cn";

const buttonVariants = tv({
  base:
    "inline-flex items-center justify-center gap-2 rounded-pill text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
  variants: {
    size: {
      default: "h-12 px-5",
      icon: "size-12",
      sm: "h-10 px-4 text-xs",
    },
    variant: {
      ghost: "bg-transparent text-foreground hover:bg-white/60",
      outline:
        "border border-white/70 bg-white/64 text-foreground shadow-whisper backdrop-blur-md hover:-translate-y-0.5 hover:bg-white/80",
      primary:
        "ui-gradient-active text-primary-foreground shadow-cloud hover:-translate-y-0.5 hover:brightness-102",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "primary",
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly busyLabel?: string;
  readonly isBusy?: boolean;
}

export const Button = ({
  busyLabel,
  children,
  className,
  isBusy = false,
  size,
  variant,
  ...props
}: ButtonProps): ReactElement => (
  <button
    className={cn(buttonVariants({ size, variant }), className)}
    disabled={isBusy || props.disabled}
    type={props.type ?? "button"}
    {...props}
  >
    {isBusy ? (busyLabel ?? children) : children}
  </button>
);
