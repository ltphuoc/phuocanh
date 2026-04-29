/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],

  semi: true,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  singleAttributePerLine: true,

  tailwindFunctions: ['tv', 'cx', 'cn', 'clsx', 'twMerge'],
  tailwindStylesheet: './src/app/globals.css',

  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.9.3',
  importOrder: [
    // Types
    '<TYPES>^(react|next)(/.*)?$',
    '<TYPES>^[^.]',
    '<TYPES>^@/',
    '<TYPES>^[.]',
    '',

    // Built-in modules
    '<BUILTIN_MODULES>',
    '',

    // React ecosystem
    '^react$',
    '^next(/.*)?$',
    '',

    // External libraries
    '<THIRD_PARTY_MODULES>',
    '',

    // Internal aliases (non-CSS)
    '^@/(?!.*\\.(css|scss|sass|less)$).*$',
    '',

    // Relative imports (non-CSS)
    '^[./](?!.*\\.(css|scss|sass|less)$).*$',
    '',

    // Styles - Global first, then modules
    '^(?!.*\\.module\\.(css|scss|sass|less)$).*\\.(css|scss|sass|less)$',
    '\\.module\\.(css|scss|sass|less)$',
  ],
};

export default config;
