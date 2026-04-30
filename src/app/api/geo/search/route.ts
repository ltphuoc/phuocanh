import { env } from '@/lib/env';
import { getAuthGateState } from '@/lib/server/couple-context';
import { searchNominatimLocations } from '@/lib/server/nominatim-geocoding';

const json = (body: unknown, status = 200): Response =>
  Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
    status,
  });

export const GET = async (request: Request): Promise<Response> => {
  const state = await getAuthGateState();
  if (state.status === 'unauthenticated') {
    return json({ error: 'unauthenticated' }, 401);
  }

  if (state.status !== 'ready') {
    return json({ error: 'couple_context_not_ready' }, 403);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return json({ locations: [] });
  }

  const result = await searchNominatimLocations({
    query,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    userId: state.context.userId,
  });

  return json(result);
};
