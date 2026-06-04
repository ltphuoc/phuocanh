/**
 * Bans arbitrary Tailwind values in the tokenized design axes (font-size,
 * letter-spacing, line-height, color, radius, shadow) so they resolve to the
 * `@theme` scale tokens in `src/app/globals.css` instead of one-off values.
 *
 * Intentionally allows:
 *  - layout one-offs: min-h-[100svh], top-[70%], aspect-[4/3], grid-cols-[...],
 *    w-[min(...)], inset-[1px], scale-[1.02], transition-[...], content-['']
 *  - functional values: *-[var(...)], rounded-[calc(...)], rounded-[inherit]
 *  - gradient images: bg-[linear-gradient(...)] (a color does not immediately
 *    follow the bracket, so the color rule below skips them)
 *
 * The rule scans string literals and template chunks; the patterns are prefix-
 * and value-anchored so non-class strings almost never match. If a false
 * positive ever surfaces, narrow the visitor to className / cn() / tv() rather
 * than weakening the bans.
 */
const BANNED = [
  [
    /\btext-\[[0-9]/,
    'font-size: use a token (text-2xs … text-display-sm), not an arbitrary text-[…] size.',
  ],
  [
    /\btracking-\[(?!var\(|calc\(|inherit)/,
    'letter-spacing: use tracking-meta / tracking-wider, not an arbitrary tracking-[…].',
  ],
  [
    /\bleading-\[(?!var\(|calc\(|inherit)/,
    'line-height: use a leading-* token, not an arbitrary leading-[…].',
  ],
  [
    /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|decoration)-\[(?:rgba?\(|#|hsla?\()/,
    'color: use a color token + /alpha modifier (e.g. bg-bg-soft/78), not a raw rgba()/#hex value.',
  ],
  [
    /\brounded-\[[0-9]/,
    'radius: use a token (rounded-card/panel/memory/hero/control), not rounded-[…rem].',
  ],
  [
    /\bshadow-\[(?!var\()/,
    'shadow: use a token (shadow-whisper/cloud/focus-*), not an arbitrary shadow-[…].',
  ],
];

function check(context, node, text) {
  for (const [re, message] of BANNED) {
    if (re.test(text)) {
      context.report({ node, message });
      break;
    }
  }
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Ban arbitrary Tailwind values in tokenized design axes' },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(context, node, node.value);
      },
      TemplateElement(node) {
        check(context, node, node.value.raw);
      },
    };
  },
};

export default rule;
