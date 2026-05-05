import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const errors = [];
const requiredStateFiles = [
  "src/apps/admin/admin.state.js",
  "src/apps/auth/auth.state.js",
  "src/apps/onboarding/onboarding.state.js",
  "src/apps/store/store.state.js",
];

function rel(path) {
  return relative(rootDir, path).replaceAll(sep, "/");
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function addError(path, message, lineNumber = 1) {
  errors.push(`${rel(path)}:${lineNumber} - ${message}`);
}

function walk(dir, predicate = () => true) {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

for (const relativePath of requiredStateFiles) {
  const file = resolve(rootDir, relativePath);
  const content = readFileSync(file, "utf8");
  for (const requiredKey of ["ui:", "entities:", "session:", "setState"]) {
    if (!content.includes(requiredKey)) {
      addError(file, `STATE GOVERNOR: state files must expose the standard ${requiredKey} layer.`);
    }
  }
}

for (const file of walk(resolve(rootDir, "src/apps"), (path) => path.endsWith(".js"))) {
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");
  const isStateFile = relativePath.endsWith(".state.js");

  if (!isStateFile) {
    for (const match of content.matchAll(/^let\s+[A-Za-z_$]/gm)) {
      addError(file, "STATE GOVERNOR: top-level mutable app state is forbidden outside *.state.js.", lineOf(content, match.index));
    }
  }

  const directMutationPattern = /\b(?:state|s)\.[A-Za-z0-9_?.]+(?:\.[A-Za-z0-9_?.]+)*\s*(?:\+=|-=|\+\+|(?<![=!<>])=(?!=))/g;
  for (const match of content.matchAll(directMutationPattern)) {
    addError(file, "STATE GOVERNOR: state mutation must go through setState(partial).", lineOf(content, match.index));
  }
}

if (errors.length > 0) {
  console.error("State integrity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("State integrity check passed.");
