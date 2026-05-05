import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.HTML) {
  console.log("HTML structure check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const errors = [];
const htmlRoots = ["index.html", "admin/index.html", "auth/index.html", "onboarding/index.html", "store/index.html"];
const maxNestingDepth = 4;
const nestingDebtFiles = new Set(["admin/index.html"]);
const exactClasses = new Set([
  "active",
  "hidden",
  "reveal",
  "is-visible",
  "btn",
  "tabs",
  "tab",
  "full-width",
]);
const governedPrefixes = [
  "admin-",
  "auth-",
  "store-",
  "landing-",
  "layout-",
  "ui-",
  "platform-",
  "solution-",
  "flow-",
  "header-",
  "dashboard-",
  "editor-",
  "panel-",
  "products-",
  "product-",
  "orders-",
  "categories-",
  "category-",
  "settings-",
  "overview-",
  "section-",
  "form-",
  "field-",
  "file-",
  "btn-",
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

function existsFile(relativePath) {
  const path = resolve(rootDir, relativePath);
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function isGovernedClass(token) {
  return exactClasses.has(token) || governedPrefixes.some((prefix) => token.startsWith(prefix));
}

function checkMaxDivNesting(file, relativePath, content) {
  if (nestingDebtFiles.has(relativePath)) {
    return;
  }

  let depth = 0;
  let maxDepth = 0;

  for (const match of content.matchAll(/<\/?div(?=[\s>])[^>]*>/gi)) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (tag.endsWith("/>")) {
      continue;
    }
    depth += 1;
    maxDepth = Math.max(maxDepth, depth);
  }

  if (maxDepth > maxNestingDepth) {
    addError(file, `HTML GOVERNOR: max div nesting depth is ${maxNestingDepth}; found ${maxDepth}.`);
  }
}

for (const relativePath of htmlRoots) {
  if (!existsFile(relativePath)) {
    addError(resolve(rootDir, relativePath), "HTML GOVERNOR: expected page entry is missing.");
    continue;
  }

  const file = resolve(rootDir, relativePath);
  const content = readFileSync(file, "utf8");

  for (const match of content.matchAll(/\bclass=["']([^"']+)["']/g)) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    for (const className of classes) {
      if (!isGovernedClass(className)) {
        addError(file, `HTML GOVERNOR: class "${className}" has no governed domain prefix.`, lineOf(content, match.index));
      }
    }
  }

  if (content.includes("layout-2col")) {
    for (const requiredClass of ["layout-shell", "layout-anchor", "layout-2col", "layout-context", "layout-form"]) {
      if (!content.includes(requiredClass)) {
        addError(file, `HTML GOVERNOR: auth/onboarding structure requires ${requiredClass}.`);
      }
    }
  }

  if (relativePath === "admin/index.html" && !content.includes("admin-container")) {
    addError(file, "HTML GOVERNOR: admin page requires admin-container shell.");
  }

  if (relativePath === "store/index.html" && !content.includes("store-shell")) {
    addError(file, "HTML GOVERNOR: store page requires store-shell.");
  }

  if (relativePath === "index.html" && !content.includes("landing-shell")) {
    addError(file, "HTML GOVERNOR: landing page requires landing-shell.");
  }

  checkMaxDivNesting(file, relativePath, content);
}

if (errors.length > 0) {
  console.error("HTML structure check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("HTML structure check passed.");
