import { resolve } from 'node:path';

export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
export const inbucketBaseUrl = 'http://127.0.0.1:54333';
export const onboardingTimeZone = 'Asia/Ho_Chi_Minh';
export const partnerAStorageStatePath = resolve('playwright/.auth/partner-a.json');
export const partnerBStorageStatePath = resolve('playwright/.auth/partner-b.json');
export const memoryFixturePath = resolve('tests/e2e/fixtures/memory-photo.svg');
