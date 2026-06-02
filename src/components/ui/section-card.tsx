import type { HTMLAttributes, ReactElement } from 'react';
import type { VariantProps } from 'tailwind-variants';

import { tv } from 'tailwind-variants';

import { cn } from '@/lib/utils/cn';

type LegacyTone = 'default' | 'gradient' | 'muted';
type SectionCardSurface = 'glass' | 'hero' | 'inset' | 'paper' | 'petal';

const sectionCardVariants = tv({
  base: "relative overflow-hidden border text-foreground transition-[color,background-color,border-color,box-shadow,transform] duration-300 before:absolute before:inset-[1px] before:rounded-[inherit] before:content-['']",
  variants: {
    padding: {
      compact: 'p-4 md:p-5',
      comfortable: 'p-5 md:p-7',
    },
    surface: {
      glass:
        'rounded-[var(--radius-panel)] border-white/70 bg-card shadow-whisper before:bg-white/12',
      hero: 'ui-gradient-hero rounded-[var(--radius-hero)] border-white/64 shadow-cloud before:bg-white/10',
      inset:
        'rounded-[var(--radius-panel)] border-[#e8c8bf]/70 bg-[rgba(255,248,241,0.72)] shadow-none before:bg-white/14',
      paper:
        'rounded-[var(--radius-panel)] border-white/72 bg-card/95 shadow-whisper before:bg-white/20',
      petal:
        'rounded-[var(--radius-panel)] border-[#e8c8bf]/75 bg-panel/90 shadow-whisper before:bg-white/16',
    },
  },
  defaultVariants: {
    padding: 'compact',
    surface: 'paper',
  },
});

export interface SectionCardProps
  extends
    HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof sectionCardVariants>, 'surface'> {
  readonly hoverLift?: boolean;
  readonly surface?: SectionCardSurface;
  readonly tone?: LegacyTone;
}

const getSurfaceFromTone = (tone?: LegacyTone): SectionCardSurface | undefined => {
  switch (tone) {
    case 'gradient':
      return 'hero';
    case 'muted':
      return 'petal';
    case 'default':
      return 'paper';
    default:
      return undefined;
  }
};

export const SectionCard = ({
  children,
  className,
  hoverLift = true,
  padding,
  surface,
  tone,
  ...props
}: SectionCardProps): ReactElement => (
  <section
    className={cn(
      sectionCardVariants({ padding, surface: surface ?? getSurfaceFromTone(tone) }),
      hoverLift ? 'hover:-translate-y-0.5 hover:shadow-cloud' : '',
      'isolate',
      className,
    )}
    {...props}
  >
    <div className="relative">{children}</div>
  </section>
);
