// Invoke-authentication helpers for the reminder processor, extracted from index.ts so they
// can be unit-tested without loading the module's top-level Deno.serve / env parsing.

export const INVOKE_SECRET_HEADER = 'x-reminder-invoke-secret';

// Constant-time string comparison: avoids leaking how many leading characters
// matched via an early-return compare. Length is folded into the accumulator so a
// length mismatch still fails without short-circuiting.
export const timingSafeEqualStrings = (expected: string, provided: string): boolean => {
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const providedBytes = encoder.encode(provided);

  let mismatch = expectedBytes.length ^ providedBytes.length;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    mismatch |= expectedBytes[index] ^ (providedBytes[index] ?? 0);
  }

  return mismatch === 0;
};
