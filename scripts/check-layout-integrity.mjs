import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.LAYOUT) {
  console.log("Layout integrity check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const stylesDir = resolve(rootDir, "src/shared/ui/styles");
const layoutOwner = "src/shared/ui/styles/core/layout.css";
const tokenOwner = "src/shared/ui/styles/core/tokens.css";
const legacyLayoutOwners = new Set([
  "src/shared/ui/styles/admin-responsive.css",
  "src/shared/ui/styles/admin-actions.css",
  "src/shared/ui/styles/admin-button-overrides.css",
  "src/shared/ui/styles/admin-buttons.css",
  "src/shared/ui/styles/admin-categories.css",
  "src/shared/ui/styles/admin-components.css",
  "src/shared/ui/styles/admin-feedback.css",
  "src/shared/ui/styles/admin-forms.css",
  "src/shared/ui/styles/admin-header.css",
  "src/shared/ui/styles/admin-overview.css",
  "src/shared/ui/styles/admin-responsive-wide.css",
  "src/shared/ui/styles/admin-responsive-tight.css",
  "src/shared/ui/styles/admin-shell.css",
  "src/shared/ui/styles/admin-settings.css",
  "src/shared/ui/styles/admin-tabs.css",
  "src/shared/ui/styles/admin-tables.css",
  "src/shared/ui/styles/auth.css",
  "src/shared/ui/styles/auth-feedback.css",
  "src/shared/ui/styles/core/utilities.css",
  "src/shared/ui/styles/landing.css",
  "src/shared/ui/styles/store.css",
  "src/shared/ui/styles/store-actions.css",
  "src/shared/ui/styles/store-card.css",
  "src/shared/ui/styles/store-feedback.css",
  "src/shared/ui/styles/store-layout.css",
  "src/shared/ui/styles/store-modal.css",
  "src/shared/ui/styles/store-responsive.css",
]);
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

function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, "");
}

for (const file of walk(stylesDir, (path) => path.endsWith(".css"))) {
  const relativePath = rel(file);
  const content = stripComments(readFileSync(file, "utf8"));
  const ownsLayout = relativePath === layoutOwner || relativePath === tokenOwner || legacyLayoutOwners.has(relativePath);

  if (!ownsLayout) {
    for (const match of content.matchAll(/\bdisplay\s*:\s*grid\b|\bgrid-template-[\w-]+\s*:|@media\b|\b(?:min-|max-)?width\s*:/g)) {
      addError(file, "LAYOUT GOVERNOR: grid, breakpoints, and width belong to the layout system.", lineOf(content, match.index));
    }
  }

  if (relativePath !== layoutOwner && /\.layout-[a-z0-9-]+\b/.test(content)) {
    addError(file, "LAYOUT GOVERNOR: layout-* selectors belong only to core/layout.css.", 1);
  }
}

if (errors.length > 0) {
  console.error("Layout integrity check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Layout integrity check passed.");
