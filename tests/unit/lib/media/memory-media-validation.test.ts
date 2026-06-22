import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  isAllowedMediaMimeType,
  isDeniedMediaMimeType,
  MEMORY_NOTE_MAX_LENGTH,
} from '@/lib/media/memory-media-validation';

describe('isAllowedMediaMimeType', () => {
  it('rejects SVG (both the standard type and the legacy alias)', () => {
    expect(isAllowedMediaMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedMediaMimeType('image/svg')).toBe(false);
  });

  it('rejects SVG regardless of case or surrounding whitespace', () => {
    expect(isAllowedMediaMimeType('  IMAGE/SVG+XML  ')).toBe(false);
  });

  it('accepts other image and video types', () => {
    expect(isAllowedMediaMimeType('image/png')).toBe(true);
    expect(isAllowedMediaMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMediaMimeType('image/webp')).toBe(true);
    expect(isAllowedMediaMimeType('video/mp4')).toBe(true);
  });

  it('rejects non-media types', () => {
    expect(isAllowedMediaMimeType('application/pdf')).toBe(false);
    expect(isAllowedMediaMimeType('text/html')).toBe(false);
  });
});

describe('isDeniedMediaMimeType', () => {
  it('flags only the SVG types', () => {
    expect(isDeniedMediaMimeType('image/svg+xml')).toBe(true);
    expect(isDeniedMediaMimeType('image/svg')).toBe(true);
    expect(isDeniedMediaMimeType('image/png')).toBe(false);
  });
});

describe('MEMORY_NOTE_MAX_LENGTH', () => {
  it('matches the Phase 1 public.memories note CHECK bound', () => {
    expect(MEMORY_NOTE_MAX_LENGTH).toBe(4000);
  });

  it('rejects a note one character over the cap and accepts one at the cap', () => {
    const schema = z.string().max(MEMORY_NOTE_MAX_LENGTH).optional();

    expect(schema.safeParse('x'.repeat(MEMORY_NOTE_MAX_LENGTH + 1)).success).toBe(false);
    expect(schema.safeParse('x'.repeat(MEMORY_NOTE_MAX_LENGTH)).success).toBe(true);
  });
});
