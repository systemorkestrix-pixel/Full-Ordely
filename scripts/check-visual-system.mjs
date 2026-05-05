import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.VISUAL) {
  console.log("Visual system check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const errors = [];

function walk(dir, predicate = () => true) {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return walk(path, predicate);
    }
    return predicate(path) ? [path] : [];
  });
}

function rel(path) {
  return relative(rootDir, path).replaceAll(sep, "/");
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function addError(path, message, lineNumber) {
  errors.push(`${rel(path)}:${lineNumber} - ${message}`);
}

const files = [
  resolve(rootDir, "index.html"),
  ...["admin", "auth", "onboarding", "store", "src"].flatMap((dir) => {
    const absoluteDir = resolve(rootDir, dir);
    return statSync(absoluteDir, { throwIfNoEntry: false })?.isDirectory()
      ? walk(absoluteDir, (path) => /\.(html|js|css)$/.test(path))
      : [];
  }),
];

for (const file of files) {
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");
  const isVisualModule = relativePath.startsWith("src/shared/ui/visual/");

  if (relativePath.endsWith(".html")) {
    for (const match of content.matchAll(/<svg\b/g)) {
      addError(file, "VISUAL GOVERNOR: inline SVG is forbidden in HTML.", lineOf(content, match.index));
    }
  }

  if (relativePath.endsWith(".js") && !isVisualModule) {
    for (const match of content.matchAll(/<svg\b/g)) {
      addError(file, "VISUAL GOVERNOR: SVG templates belong only to src/shared/ui/visual.", lineOf(content, match.index));
    }
  }

  if (relativePath.endsWith(".css") && relativePath !== "src/shared/ui/visual/visual.css") {
    for (const match of content.matchAll(/(^|[,{]\s*)(svg|path|rect|circle)(?=[\s.#:[,{>+~])/gm)) {
      addError(file, "VISUAL GOVERNOR: SVG styling belongs only to visual.css.", lineOf(content, match.index));
    }
  }
}

if (errors.length > 0) {
  console.error("Visual system check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Visual system check passed.");
