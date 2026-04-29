import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const messagesDirectory = path.resolve(process.cwd(), 'messages');

const readJsonFile = async (fileName) => {
  const filePath = path.join(messagesDirectory, fileName);
  const fileContent = await readFile(filePath, 'utf8');
  return JSON.parse(fileContent);
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeMessages = (base, override) => {
  const merged = {
    ...base,
  };

  Object.entries(override).forEach(([key, overrideValue]) => {
    if (overrideValue === undefined) {
      return;
    }

    const baseValue = base[key];

    if (typeof overrideValue === 'string') {
      merged[key] = overrideValue;
      return;
    }

    if (isRecord(baseValue) && isRecord(overrideValue)) {
      merged[key] = mergeMessages(baseValue, overrideValue);
      return;
    }

    if (isRecord(overrideValue)) {
      merged[key] = mergeMessages({}, overrideValue);
    }
  });

  return merged;
};

const deleteDeepKey = (source, pathSegments) => {
  if (pathSegments.length === 0) {
    return;
  }

  const [head, ...rest] = pathSegments;
  if (!isRecord(source) || !(head in source)) {
    return;
  }

  if (rest.length === 0) {
    delete source[head];
    return;
  }

  deleteDeepKey(source[head], rest);
};

const getDeepValue = (source, pathSegments) => {
  return pathSegments.reduce((current, segment) => {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    return current[segment];
  }, source);
};

const run = async () => {
  const enMessages = await readJsonFile('en.json');
  const viMessages = await readJsonFile('vi.json');

  const fallbackTarget = ['common', 'working'];
  const viWithMissingKey = structuredClone(viMessages);
  deleteDeepKey(viWithMissingKey, fallbackTarget);

  const merged = mergeMessages(enMessages, viWithMissingKey);
  const fallbackValue = getDeepValue(merged, fallbackTarget);
  const expectedFallbackValue = getDeepValue(enMessages, fallbackTarget);
  const existingLocaleValue = getDeepValue(merged, ['common', 'backHome']);
  const expectedLocaleValue = getDeepValue(viMessages, ['common', 'backHome']);

  if (fallbackValue !== expectedFallbackValue) {
    throw new Error(
      `Fallback mismatch for ${fallbackTarget.join('.')}: expected '${expectedFallbackValue}', received '${fallbackValue}'`,
    );
  }

  if (existingLocaleValue !== expectedLocaleValue) {
    throw new Error('Locale override regression detected while validating fallback behavior.');
  }

  console.log('Fallback merge check passed.');
};

run().catch((error) => {
  console.error('Fallback merge check failed.', error);
  process.exitCode = 1;
});
