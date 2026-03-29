import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { glob } from "node:fs/promises";

const workspaceRoot = process.cwd();
const strictMode = process.argv.includes("--strict");

const includeGlobs = ["src/app/**/*.tsx", "src/components/**/*.tsx"];

const allowList = new Set([
  "PhuocAnh",
]);

const textNodeRegex = />\s*([^\n<>{}=;()]+?)\s*</gu;

const normalizeText = (text) => text.replace(/\s+/gu, " ").trim();

const isAllowedText = (value) => {
  if (!value) {
    return true;
  }

  if (allowList.has(value)) {
    return true;
  }

  if (/^[0-9: AMPamp.-]+$/u.test(value)) {
    return true;
  }

  if (/^[A-Z0-9&]+$/u.test(value)) {
    return true;
  }

  return false;
};

const run = async () => {
  const findings = [];

  for (const includeGlob of includeGlobs) {
    for await (const filePath of glob(includeGlob)) {
      const absolutePath = path.resolve(workspaceRoot, filePath);
      const source = await readFile(absolutePath, "utf8");

      let match = textNodeRegex.exec(source);
      while (match) {
        const text = normalizeText(match[1] ?? "");
        if (!/[A-Za-z]/u.test(text)) {
          match = textNodeRegex.exec(source);
          continue;
        }

        if (!isAllowedText(text)) {
          findings.push({
            filePath,
            text,
          });
        }

        match = textNodeRegex.exec(source);
      }
    }
  }

  if (findings.length === 0) {
    console.log("Hardcoded UI text audit passed.");
    return;
  }

  console.log(`Hardcoded UI text audit found ${findings.length} candidate text nodes:`);
  findings.slice(0, 200).forEach((finding) => {
    console.log(`- ${finding.filePath}: \"${finding.text}\"`);
  });

  if (findings.length > 200) {
    console.log(`...and ${findings.length - 200} more`);
  }

  if (strictMode) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("Hardcoded UI text audit failed.", error);
  process.exitCode = 1;
});
