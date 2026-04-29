import { headers } from 'next/headers';

import { env } from '@/lib/env';

export const getSiteUrl = async (): Promise<string> => {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';

  if (host) {
    return `${protocol}://${host}`;
  }

  return env.NEXT_PUBLIC_SITE_URL;
};
