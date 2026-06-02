/**
 * Distinguishes a real production runtime from local development and per-branch
 * preview deployments.
 *
 * On Vercel, `VERCEL_ENV` is the authoritative marker (`production` | `preview` |
 * `development`). When it is absent (local `next build`/`start`, CI), fall back to
 * `NODE_ENV`. The bias is intentionally "treat as production when ambiguous": a
 * production runtime must rely on a server-trusted site URL rather than
 * client/forwarded headers, so erring toward production is the safer default.
 */
export const isProductionRuntime = (): boolean => {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) {
    return vercelEnv === 'production';
  }

  return process.env.NODE_ENV === 'production';
};
