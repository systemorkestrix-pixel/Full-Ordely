import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.JS) {
  console.log("JS boundary check skipped.");
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

const jsFiles = walk(resolve(rootDir, "src"), (path) => path.endsWith(".js"));

for (const file of jsFiles) {
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");

  if (relativePath.startsWith("src/apps/")) {
    for (const match of content.matchAll(/from\s+["']([^"']*\/core\/[^"']+)["']/g)) {
      addError(file, `JS GOVERNOR: apps must use feature services, not core imports (${match[1]}).`, lineOf(content, match.index));
    }
  }

  const isSupabaseCoreFile = relativePath === "src/core/api.js" || relativePath.startsWith("src/core/api/");

  if (!isSupabaseCoreFile) {
    for (const match of content.matchAll(/\bcreateClient\b|@supabase\/supabase-js|\bsupabase\s*\./g)) {
      addError(file, "JS GOVERNOR: Supabase client usage is allowed only in src/core/api/.", lineOf(content, match.index));
    }
  }
}

if (errors.length > 0) {
  console.error("JS boundary check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("JS boundary check passed.");
