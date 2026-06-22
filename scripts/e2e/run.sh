#!/usr/bin/env sh
set -eu

if [ -f ./.env.local ]; then
  set -a
  . ./.env.local
  set +a
elif [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3100}"
# Force the site URL to the dedicated E2E server origin, overriding any dev value
# inherited from .env.local. `next start` is a production runtime, so getSiteUrl()
# trusts only this baked value; a stale dev origin would redirect magic-link/invite
# callbacks at a port nothing listens on (ERR_CONNECTION_REFUSED).
export NEXT_PUBLIC_SITE_URL="$E2E_BASE_URL"
export E2E_ENABLE_EMAIL_OTP_HELPER="${E2E_ENABLE_EMAIL_OTP_HELPER:-true}"
export E2E_RUN_TOKEN="${E2E_RUN_TOKEN:-$(node -e "console.log(require('node:crypto').randomUUID().slice(0, 8))")}"
export OPENAI_DAILY_QUESTION_STUB_RESPONSE="${OPENAI_DAILY_QUESTION_STUB_RESPONSE:-What small thing made you feel especially cared for recently?}"
export TZ="${TZ:-Asia/Ho_Chi_Minh}"

supabase start
supabase db reset --local
pnpm build
pnpm exec playwright test "$@"
