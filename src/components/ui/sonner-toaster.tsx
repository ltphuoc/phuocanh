'use client';

import type { ReactElement } from 'react';

import { Toaster } from 'sonner';

export const SonnerToaster = (): ReactElement => (
  <Toaster
    closeButton
    position="top-center"
    toastOptions={{
      classNames: {
        actionButton:
          '!rounded-xl !border !border-border !bg-card !text-foreground !shadow-[var(--elevation-soft)]',
        cancelButton:
          '!rounded-xl !border !border-border !bg-muted-soft !text-foreground !shadow-[var(--elevation-soft)]',
        description: '!text-muted-foreground',
        error: '!border !border-border !bg-card !text-foreground',
        info: '!border !border-border !bg-card !text-foreground',
        success: '!border !border-border !bg-card !text-foreground',
        toast:
          '!rounded-2xl !border !border-border !bg-card !text-foreground !shadow-[var(--elevation-soft)]',
        warning: '!border !border-border !bg-card !text-foreground',
      },
    }}
  />
);
