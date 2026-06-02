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

// The `<main>` landmark is owned by `(app)/layout.tsx` (with id="main-content"),
// so this shell renders only the inner stack — wrapping it in `<main>` here
// would produce a nested landmark on every consumer page.
export const ShellPage = ({
  action,
  children,
  description,
  eyebrow,
  quote,
  title,
}: ShellPageProps): ReactElement => (
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
);
