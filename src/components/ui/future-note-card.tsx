import type { ReactElement } from 'react';

import { Lock, LockOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';

interface FutureNoteCardProps {
  readonly body?: string | null;
  readonly status: 'locked' | 'unlocked';
  readonly statusLabel: string;
  readonly title: string;
  readonly unlockDateLabel: string;
}

export const FutureNoteCard = ({
  body,
  status,
  statusLabel,
  title,
  unlockDateLabel,
}: FutureNoteCardProps): ReactElement => (
  <SectionCard
    className="flex flex-col gap-4"
    hoverLift={false}
    padding="compact"
    surface={status === 'unlocked' ? 'glass' : 'paper'}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2">
        <p className="ui-meta">{unlockDateLabel}</p>
        <h3 className="font-display text-[1.5rem] leading-[1.2] tracking-[-0.03em] text-foreground">
          {title}
        </h3>
      </div>
      <Badge
        className="gap-2"
        variant={status === 'unlocked' ? 'primary' : 'neutral'}
      >
        {status === 'unlocked' ? (
          <LockOpen
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={2.1}
          />
        ) : (
          <Lock
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={2.1}
          />
        )}
        <span>{statusLabel}</span>
      </Badge>
    </div>
    {body?.trim() ? (
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/88">{body}</p>
    ) : null}
  </SectionCard>
);
