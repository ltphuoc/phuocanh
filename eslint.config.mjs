import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

import noArbitraryDesignTokens from './eslint-rules/no-arbitrary-design-tokens.mjs';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),

  prettier,

  {
    rules: {
      'import/order': 'off',

      // // ═══════════════════════════════════════════════════
      // // 🔥 TYPESCRIPT
      // // ═══════════════════════════════════════════════════
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // // 🆕 Best practices
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',

      // // ═══════════════════════════════════════════════════
      // // ⚡ JAVASCRIPT - Code quality
      // // ═══════════════════════════════════════════════════
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      // 'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // // ═══════════════════════════════════════════════════
      // // ⚛️ REACT/NEXT.JS
      // // ═══════════════════════════════════════════════════
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-no-target-blank': 'error',

      // // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },

  // Keep Tailwind classes on the design-token scale: ban arbitrary values in the
  // tokenized axes (font-size, tracking, leading, color, radius, shadow) while
  // allowing layout one-offs and functional var()/calc()/inherit forms.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'design-tokens': { rules: { 'no-arbitrary': noArbitraryDesignTokens } } },
    rules: { 'design-tokens/no-arbitrary': 'error' },
  },
]);

export default eslintConfig;
