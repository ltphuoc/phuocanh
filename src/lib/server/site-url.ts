import { headers } from 'next/headers';

import { env } from '@/lib/env';
import { isProductionRuntime } from '@/lib/runtime-env';

/**
 * Resolves the server-trusted base origin for building outbound links
 * (magic-link / invite callbacks).
 *
 * In production the origin comes only from the configured NEXT_PUBLIC_SITE_URL;
 * forwarded headers are ignored so a spoofed `X-Forwarded-Host` cannot redirect
 * auth callbacks at an attacker-controlled origin. In development and preview
 * (where each branch deploy serves from its own host) the forwarded host is
 * trusted so callbacks resolve to the correct per-environment origin.
 */
export const getSiteUrl = async (): Promise<string> => {
  if (isProductionRuntime()) {
    return env.NEXT_PUBLIC_SITE_URL;
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost ?? requestHeaders.get('host');

  if (host) {
    const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = requestHeaders.get('x-forwarded-proto') ?? (isLocalHost ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  return env.NEXT_PUBLIC_SITE_URL;
};
