import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const cssDir = resolve(rootDir, "src/shared/ui/styles");
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

for (const file of walk(cssDir).filter((path) => path.endsWith(".css"))) {
  const lineCount = readFileSync(file, "utf8").split(/\r?\n/).length;
  if (lineCount > 400) {
    errors.push(`${rel(file)} - CSS GOVERNOR: CSS files must stay at or below 400 lines (${lineCount}).`);
  }
}

if (errors.length > 0) {
  console.error("CSS size check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("CSS size check passed.");
