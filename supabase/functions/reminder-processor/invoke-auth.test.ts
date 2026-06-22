import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';

import { INVOKE_SECRET_HEADER, timingSafeEqualStrings } from './invoke-auth.ts';

// The invoke-secret gate must accept only an exact match and must not short-circuit on a
// length mismatch (the loop folds the length difference into the accumulator).
Deno.test('timingSafeEqualStrings is true only on an exact match', () => {
  assert(timingSafeEqualStrings('s', 's'));
  assert(timingSafeEqualStrings('a-long-shared-invoke-secret', 'a-long-shared-invoke-secret'));
});

Deno.test('timingSafeEqualStrings rejects a same-length value mismatch', () => {
  assertFalse(timingSafeEqualStrings('secret', 'sxcret'));
  assertFalse(timingSafeEqualStrings('secret', 'wrong!'));
});

Deno.test('timingSafeEqualStrings rejects a length mismatch without short-circuiting', () => {
  assertFalse(timingSafeEqualStrings('secret', 'secretextra'));
  assertFalse(timingSafeEqualStrings('secret', 'sec'));
  assertFalse(timingSafeEqualStrings('secret', ''));
  assertFalse(timingSafeEqualStrings('', 'secret'));
});

Deno.test('INVOKE_SECRET_HEADER is the documented header name', () => {
  assertEquals(INVOKE_SECRET_HEADER, 'x-reminder-invoke-secret');
});
