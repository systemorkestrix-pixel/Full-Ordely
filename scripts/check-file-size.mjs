import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const scanRoots = ["admin", "auth", "onboarding", "store", "src", "scripts", "system"];
const extensions = new Set([".js", ".mjs", ".css", ".html"]);
const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

function rel(path) {
  return relative(rootDir, path).replaceAll(sep, "/");
}

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

for (const root of scanRoots) {
  const absoluteRoot = resolve(rootDir, root);
  if (!statSync(absoluteRoot, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(absoluteRoot)) {
    if (!extensions.has(extensionOf(file))) continue;
    const lineCount = readFileSync(file, "utf8").split(/\r?\n/).length;
    if (lineCount > 600) {
      errors.push(`${rel(file)} - SIZE GOVERNOR: any file over 600 lines is forbidden (${lineCount}).`);
    }
  }
}

if (errors.length > 0) {
  console.error("File size check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("File size check passed.");
