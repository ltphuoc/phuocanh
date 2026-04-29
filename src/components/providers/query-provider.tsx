'use client';

import type { ReactElement, ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query/query-client';

interface QueryProviderProps {
  readonly children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps): ReactElement => (
  <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
);
