import { Fraunces, Manrope } from 'next/font/google';

export const fraunces = Fraunces({
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
});

export const manrope = Manrope({
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
});
