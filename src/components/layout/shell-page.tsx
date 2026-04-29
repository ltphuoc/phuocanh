import type { ReactElement, ReactNode } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { SectionStack } from '@/components/layout/section-stack';
import { PageReveal } from '@/components/ui/page-reveal';

interface ShellPageProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly description: string;
  readonly eyebrow: string;
  readonly quote?: string;
  readonly title: string;
}

export const ShellPage = ({
  action,
  children,
  description,
  eyebrow,
  quote,
  title,
}: ShellPageProps): ReactElement => (
  <main>
    <SectionStack>
      <PageReveal>
        <PageHeader
          action={action}
          description={description}
          eyebrow={eyebrow}
          quote={quote}
          title={title}
        />
      </PageReveal>
      {children}
    </SectionStack>
  </main>
);
