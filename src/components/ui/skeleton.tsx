import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '@/lib/utils/cn';

// ─── Base block ─────────────────────────────────────────────────────────────

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Token radius variant. Defaults to 'control'. */
  readonly radius?: 'control' | 'panel' | 'memory' | 'hero' | 'pill';
}

/**
 * Muted placeholder block with a subtle pulse animation.
 * The global `prefers-reduced-motion` block in globals.css sets
 * `animation-duration: 0.001ms !important` which neutralises the pulse.
 */
export const Skeleton = ({
  className,
  radius = 'control',
  ...props
}: SkeletonProps): ReactElement => (
  <div
    aria-hidden="true"
    className={cn(
      'animate-pulse bg-muted',
      radius === 'control' && 'rounded-[var(--radius-control)]',
      radius === 'panel' && 'rounded-[var(--radius-panel)]',
      radius === 'memory' && 'rounded-[var(--radius-memory)]',
      radius === 'hero' && 'rounded-[var(--radius-hero)]',
      radius === 'pill' && 'rounded-[var(--radius-pill)]',
      className,
    )}
    {...props}
  />
);

// ─── Composed layout skeletons ───────────────────────────────────────────────

interface LayoutSkeletonProps {
  /** Localized accessible label for the loading region. */
  readonly label?: string;
}

/**
 * Mirrors `TimelineRibbon` — a vertical stack of memory-card placeholders
 * with a left timeline line and dot.
 */
export const TimelineSkeleton = ({ label }: LayoutSkeletonProps): ReactElement => (
  <div
    aria-busy="true"
    aria-label={label}
    className="relative flex flex-col gap-6 pl-4 md:gap-8 md:pl-8"
    role="status"
  >
    {/* Timeline line */}
    <div className="absolute top-0 bottom-0 left-[7px] w-px bg-muted md:left-[15px]" />

    {[0, 1, 2, 3].map((i) => (
      <div
        className="relative flex flex-col gap-4"
        key={i}
      >
        {/* Month divider pill */}
        {i === 0 || i === 2 ? (
          <Skeleton
            className="ml-4 h-7 w-32 md:ml-6"
            radius="pill"
          />
        ) : null}

        <div className="relative">
          {/* Timeline dot */}
          <div className="absolute top-6 left-[-4px] size-3 rounded-full bg-muted md:left-0" />
          {/* Memory card placeholder */}
          <Skeleton
            className={cn('h-40 w-full', i % 2 === 0 ? 'md:ml-12' : 'md:mr-12')}
            radius="memory"
          />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Mirrors `ResponsiveGrid` of cards — 2-column grid of card placeholders
 * matching trips, albums, countdowns, lists, future-notes pages.
 */
export const CardGridSkeleton = ({ label }: LayoutSkeletonProps): ReactElement => (
  <div
    aria-busy="true"
    aria-label={label}
    className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:gap-6"
    role="status"
  >
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div
        className="flex flex-col gap-3"
        key={i}
      >
        {/* Card image area */}
        <Skeleton
          className="h-36 w-full"
          radius="panel"
        />
        {/* Card title line */}
        <Skeleton className="h-5 w-3/4" />
        {/* Card meta line */}
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

/**
 * Mirrors the stats tile grid — 2-column grid of stat placeholders
 * matching `StatCardTemplate` layout.
 */
export const StatGridSkeleton = ({ label }: LayoutSkeletonProps): ReactElement => (
  <div
    aria-busy="true"
    aria-label={label}
    className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:gap-6"
    role="status"
  >
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div
        className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-panel p-5"
        key={i}
      >
        {/* Label (meta) */}
        <Skeleton className="h-3 w-20" />
        {/* Large numeric value */}
        <Skeleton className="h-10 w-28" />
        {/* Optional trend label */}
        <Skeleton className="h-3 w-24" />
      </div>
    ))}
  </div>
);

/**
 * Mirrors a `PageHeader` + content card — used for memory/trip/album detail pages.
 */
export const DetailSkeleton = ({ label }: LayoutSkeletonProps): ReactElement => (
  <div
    aria-busy="true"
    aria-label={label}
    className="flex flex-col gap-6"
    role="status"
  >
    {/* Page header area */}
    <div className="flex flex-col gap-3">
      <Skeleton
        className="h-8 w-2/3"
        radius="control"
      />
      <Skeleton
        className="h-5 w-1/2"
        radius="control"
      />
    </div>
    {/* Hero / media area */}
    <Skeleton
      className="h-56 w-full md:h-72"
      radius="memory"
    />
    {/* Content card */}
    <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] bg-panel p-5">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
      <Skeleton className="h-5 w-4/6" />
    </div>
  </div>
);
