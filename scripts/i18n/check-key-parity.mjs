import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const messagesDirectory = path.resolve(process.cwd(), 'messages');
const canonicalLocale = 'en';

const readJsonFile = async (filePath) => {
  const fileContent = await readFile(filePath, 'utf8');
  return JSON.parse(fileContent);
};

const isObjectRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const flattenMessageKeys = (value, prefix = '') => {
  if (!isObjectRecord(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    if (isObjectRecord(nestedValue)) {
      return flattenMessageKeys(nestedValue, nextPrefix);
    }

    if (typeof nestedValue === 'string') {
      return [nextPrefix];
    }

    return [];
  });
};

// Pure parity comparison so it can be unit tested without touching the filesystem.
// Each locale reports keys missing relative to the canonical set and unknown keys not
// present in it.
export const findParityIssues = (canonicalKeys, localeEntries) => {
  const canonicalKeySet = new Set(canonicalKeys);

  return localeEntries.map(({ locale, keys }) => {
    const localeKeySet = new Set(keys);

    return {
      locale,
      missingKeys: [...canonicalKeySet].filter((key) => !localeKeySet.has(key)),
      unknownKeys: keys.filter((key) => !canonicalKeySet.has(key)),
    };
  });
};

const run = async () => {
  const files = await readdir(messagesDirectory);
  const localeFiles = files
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => ({
      fileName,
      locale: fileName.replace(/\.json$/u, ''),
      path: path.join(messagesDirectory, fileName),
    }));

  const canonicalFile = localeFiles.find((entry) => entry.locale === canonicalLocale);
  if (!canonicalFile) {
    throw new Error(`Missing canonical locale file: ${canonicalLocale}.json`);
  }

  const canonicalMessages = await readJsonFile(canonicalFile.path);
  const canonicalKeys = flattenMessageKeys(canonicalMessages);

  const localeEntries = [];
  for (const localeFile of localeFiles) {
    if (localeFile.locale === canonicalLocale) {
      continue;
    }

    const localeMessages = await readJsonFile(localeFile.path);
    localeEntries.push({ locale: localeFile.locale, keys: flattenMessageKeys(localeMessages) });
  }

  const issues = findParityIssues(canonicalKeys, localeEntries);

  console.log(`Canonical locale: ${canonicalLocale} (${canonicalKeys.length} keys)`);
  let hasParityIssues = false;
  for (const issue of issues) {
    console.log(
      `Locale ${issue.locale}: ${issue.missingKeys.length} missing keys, ${issue.unknownKeys.length} unknown keys`,
    );
    issue.missingKeys.forEach((key) => {
      console.log(`  Missing: ${key}`);
    });
    issue.unknownKeys.forEach((key) => {
      console.log(`  Unknown: ${key}`);
    });

    if (issue.missingKeys.length > 0 || issue.unknownKeys.length > 0) {
      hasParityIssues = true;
    }
  }

  if (hasParityIssues) {
    process.exitCode = 1;
    return;
  }

  console.log('Key parity check passed (locales match the canonical keys).');
};

// Only run the filesystem check when invoked directly, so the pure helpers above can
// be imported by tests without side effects.
const isInvokedDirectly = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isInvokedDirectly) {
  run().catch((error) => {
    console.error('Key parity check failed.', error);
    process.exitCode = 1;
  });
}
