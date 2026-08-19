#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");
const definitionPattern = /(?:^|[{;])\s*(--[A-Za-z0-9_-]+)\s*:/gm;
const usagePattern = /var\(\s*(--[A-Za-z0-9_-]+)/g;

function walk(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
    } else if (entry.name.endsWith(".css")) {
      output.push(fullPath);
    }
  }
  return output;
}

const cssFiles = walk(src);
const definedTokens = new Set();

for (const file of cssFiles) {
  for (const match of readFileSync(file, "utf8").matchAll(definitionPattern)) {
    definedTokens.add(match[1]);
  }
}

const violations = [];

for (const file of cssFiles) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(usagePattern)) {
      const token = match[1];
      if (!token.startsWith("--gnrc-") || !definedTokens.has(token)) {
        violations.push({
          file: relative(root, file),
          line: index + 1,
          column: (match.index ?? 0) + 1,
          token,
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Token contract failed:");
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line}:${violation.column} ${violation.token}`,
    );
  }
  process.exit(1);
}

console.log(
  `Token contract passed: ${definedTokens.size} tokens, ${cssFiles.length} CSS files.`,
);

