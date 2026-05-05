import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const errors = [];
const adminDir = resolve(rootDir, "src/apps/admin");
const requiredFiles = [
  "admin.runtime.js",
  "admin.state.js",
  "admin.events.js",
  "admin.render.js",
  "admin.actions.js",
  "admin.validation.js",
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

for (const fileName of requiredFiles) {
  const path = resolve(adminDir, fileName);
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    addError(path, "ADMIN GOVERNOR: required admin structure file is missing.");
  }
}

const runtimePath = resolve(adminDir, "admin.runtime.js");
const runtimeLines = readFileSync(runtimePath, "utf8").split(/\r?\n/).length;
if (runtimeLines >= 300) {
  addError(runtimePath, "ADMIN GOVERNOR: admin.runtime.js must stay below 300 lines.");
}

const renderPath = resolve(adminDir, "admin.render.js");
const renderContent = readFileSync(renderPath, "utf8");
for (const match of renderContent.matchAll(/\b(fetch|XMLHttpRequest|supabase|from\(["'][^"']+["']\)|rpc\(|\.storage\b)\b/g)) {
  addError(renderPath, "ADMIN GOVERNOR: render must not call API or backend primitives.", lineOf(renderContent, match.index));
}

for (const file of walk(resolve(rootDir, "src/features"), (path) => path.endsWith(".js"))) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/\bdocument\.|\bwindow\.|querySelector|getElementById|innerHTML|classList/g)) {
    addError(file, "ADMIN GOVERNOR: feature services must not touch DOM.", lineOf(content, match.index));
  }
}

for (const file of walk(adminDir, (path) => path.endsWith(".js"))) {
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");
  if (relativePath.endsWith("admin.render.js")) continue;
  if (/\bfunction\s+renderAdmin|innerHTML\s*=|document\.createElement/.test(content) && !relativePath.endsWith("admin.events.js")) {
    addError(file, "ADMIN GOVERNOR: DOM rendering belongs in admin.render.js.", 1);
  }
}

if (errors.length > 0) {
  console.error("Admin structure check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Admin structure check passed.");
