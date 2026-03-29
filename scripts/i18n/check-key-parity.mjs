import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const messagesDirectory = path.resolve(process.cwd(), "messages");
const canonicalLocale = "en";

const readJsonFile = async (filePath) => {
  const fileContent = await readFile(filePath, "utf8");
  return JSON.parse(fileContent);
};

const isObjectRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const flattenMessageKeys = (value, prefix = "") => {
  if (!isObjectRecord(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    if (isObjectRecord(nestedValue)) {
      return flattenMessageKeys(nestedValue, nextPrefix);
    }

    if (typeof nestedValue === "string") {
      return [nextPrefix];
    }

    return [];
  });
};

const run = async () => {
  const files = await readdir(messagesDirectory);
  const localeFiles = files
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => ({
      fileName,
      locale: fileName.replace(/\.json$/u, ""),
      path: path.join(messagesDirectory, fileName),
    }));

  const canonicalFile = localeFiles.find((entry) => entry.locale === canonicalLocale);
  if (!canonicalFile) {
    throw new Error(`Missing canonical locale file: ${canonicalLocale}.json`);
  }

  const canonicalMessages = await readJsonFile(canonicalFile.path);
  const canonicalKeys = new Set(flattenMessageKeys(canonicalMessages));

  const report = [];
  let hasUnknownKeys = false;

  for (const localeFile of localeFiles) {
    if (localeFile.locale === canonicalLocale) {
      continue;
    }

    const localeMessages = await readJsonFile(localeFile.path);
    const localeKeys = flattenMessageKeys(localeMessages);

    const unknownKeys = localeKeys.filter((key) => !canonicalKeys.has(key));
    const missingKeys = [...canonicalKeys].filter((key) => !localeKeys.includes(key));

    if (unknownKeys.length > 0) {
      hasUnknownKeys = true;
    }

    report.push({
      locale: localeFile.locale,
      missingKeyCount: missingKeys.length,
      unknownKeys,
    });
  }

  console.log(`Canonical locale: ${canonicalLocale} (${canonicalKeys.size} keys)`);
  for (const item of report) {
    console.log(`Locale ${item.locale}: ${item.missingKeyCount} missing keys, ${item.unknownKeys.length} unknown keys`);
    item.unknownKeys.forEach((key) => {
      console.log(`  Unknown: ${key}`);
    });
  }

  if (hasUnknownKeys) {
    process.exitCode = 1;
    return;
  }

  console.log("Key parity check passed (no unknown locale keys).");
};

run().catch((error) => {
  console.error("Key parity check failed.", error);
  process.exitCode = 1;
});
