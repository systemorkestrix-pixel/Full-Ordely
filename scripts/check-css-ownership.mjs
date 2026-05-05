import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.CSS) {
  console.log("CSS ownership check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const stylesDir = resolve(rootDir, "src/shared/ui/styles");
const visualDir = resolve(rootDir, "src/shared/ui/visual");
const coreLayoutCss = "src/shared/ui/styles/core/layout.css";
const authLayoutHtmlFiles = new Set(["auth/index.html", "onboarding/index.html"]);
const allowedLayoutClassFiles = new Set([
  coreLayoutCss,
  "auth/index.html",
  "onboarding/index.html",
  "src/apps/auth/auth.js",
  "src/apps/onboarding/onboarding.js",
]);
const allowedInjectedLayoutClasses = new Set(["layout-density-optional"]);
const forbiddenLegacyLayoutClasses = new Set([
  "layout-bound",
  "layout-primary",
  "layout-secondary",
]);
const scanDirs = [
  resolve(rootDir, "admin"),
  resolve(rootDir, "auth"),
  resolve(rootDir, "store"),
  resolve(rootDir, "src/apps"),
  stylesDir,
  visualDir,
];

const errors = [];
const forbiddenInjectedClassTokens = new Set([
  "btn",
  "card",
  "modal",
  "table",
  "row",
  "col",
  "container",
]);

function walk(dir, predicate = () => true) {
  return readdirSync(dir)
    .flatMap((entry) => {
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

function addError(path, message, lineNumber) {
  const suffix = lineNumber ? `:${lineNumber}` : "";
  errors.push(`${rel(path)}${suffix} - ${message}`);
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function stripCssComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, "");
}

function getSelectorBlocks(content) {
  const clean = stripCssComments(content);
  const blocks = [];
  const regex = /([^{}@]+)\{/g;
  let match;
  while ((match = regex.exec(clean))) {
    blocks.push({
      selector: match[1].trim(),
      index: match.index,
    });
  }
  return blocks;
}

const cssFiles = [
  ...walk(stylesDir, (path) => path.endsWith(".css")),
  ...walk(visualDir, (path) => path.endsWith(".css")),
];
const domainCssEntries = new Map([
  ["landing.css", "landing"],
  ["auth.css", "auth"],
  ["store.css", "store"],
  ["admin.css", "admin"],
]);

function getPathDomain(path) {
  const relativePath = rel(path);
  if (relativePath === "index.html") {
    return "landing";
  }
  if (relativePath.startsWith("admin/") || relativePath.startsWith("src/apps/admin/")) {
    return "admin";
  }
  if (relativePath.startsWith("auth/") || relativePath.startsWith("src/apps/auth/")) {
    return "auth";
  }
  if (relativePath.startsWith("store/") || relativePath.startsWith("src/apps/store/")) {
    return "store";
  }
  if (relativePath.startsWith("src/shared/ui/styles/admin")) {
    return "admin";
  }
  if (relativePath.endsWith("/landing.css")) {
    return "landing";
  }
  if (relativePath.endsWith("/auth.css")) {
    return "auth";
  }
  if (relativePath.endsWith("/store.css")) {
    return "store";
  }
  return null;
}

function getCssRefDomain(ref) {
  const fileName = ref.split(/[\\/]/).pop();
  if (!fileName) {
    return null;
  }
  if (fileName === "base.css" || ref.includes("/core/") || ref.startsWith("./core/")) {
    return "core";
  }
  if (fileName === "visual.css") {
    return "visual";
  }
  if (domainCssEntries.has(fileName)) {
    return domainCssEntries.get(fileName);
  }
  if (fileName.startsWith("admin-")) {
    return "admin";
  }
  if (fileName.startsWith("auth-")) {
    return "auth";
  }
  if (fileName.startsWith("store-")) {
    return "store";
  }
  return null;
}

function isVisualModule(file) {
  return rel(file).startsWith("src/shared/ui/visual/");
}

function isVisualCss(file) {
  return rel(file) === "src/shared/ui/visual/visual.css";
}

function isCoreLayoutCss(file) {
  return rel(file) === coreLayoutCss;
}

function checkCssImportBoundary(file, content) {
  const ownerDomain = getPathDomain(file);
  if (!ownerDomain) {
    return;
  }

  for (const match of content.matchAll(/["']([^"']+\.css)["']/g)) {
    const ref = match[1];
    const refDomain = getCssRefDomain(ref);
    if (!refDomain || refDomain === "core" || refDomain === "visual" || refDomain === ownerDomain) {
      continue;
    }

    addError(
      file,
      `CSS IMPORT BOUNDARY: ${ownerDomain} must not import/link ${refDomain} CSS (${ref}).`,
      lineOf(content, match.index),
    );
  }
}

function checkVisualOwnership(file, content) {
  const relativePath = rel(file);
  const extension = relativePath.split(".").pop();

  if (extension === "html") {
    for (const match of content.matchAll(/<svg\b/g)) {
      addError(file, "VISUAL OWNERSHIP: Inline SVG inside HTML is forbidden.", lineOf(content, match.index));
    }
  }

  if (extension === "js" && !isVisualModule(file)) {
    for (const match of content.matchAll(/<svg\b/g)) {
      addError(
        file,
        "VISUAL OWNERSHIP: SVG template strings are only allowed inside src/shared/ui/visual modules.",
        lineOf(content, match.index),
      );
    }
  }

  if (!isVisualModule(file)) {
    for (const match of content.matchAll(/["']([^"']+\.svg)["']/g)) {
      addError(
        file,
        `VISUAL OWNERSHIP: Direct SVG file usage is forbidden outside the visual system (${match[1]}).`,
        lineOf(content, match.index),
      );
    }
  }

  if (extension === "css" && !isVisualCss(file)) {
    for (const block of getSelectorBlocks(content)) {
      const selectors = block.selector
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean);

      for (const selector of selectors) {
        if (/(^|[\s>+~.#:[(])(svg|path|rect|circle)(?=$|[\s.#:[)>+~])/.test(selector)) {
          addError(
            file,
            `VISUAL CSS OWNERSHIP: SVG selectors must live in visual.css only: "${selector}".`,
            lineOf(content, block.index),
          );
        }
      }
    }
  }
}

function checkVisualCssImportBoundary(files) {
  const visualImports = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/["']([^"']*visual\.css)["']/g)) {
      visualImports.push({ file, index: match.index, ref: match[1] });
    }
  }

  for (const visualImport of visualImports) {
    if (rel(visualImport.file) !== "src/shared/ui/styles/base.css") {
      addError(
        visualImport.file,
        `VISUAL IMPORT BOUNDARY: visual.css must be imported only through base.css (${visualImport.ref}).`,
        lineOf(readFileSync(visualImport.file, "utf8"), visualImport.index),
      );
    }
  }

  if (visualImports.length !== 1) {
    const anchorFile = resolve(rootDir, "src/shared/ui/visual/visual.css");
    addError(anchorFile, `VISUAL IMPORT BOUNDARY: visual.css must be imported exactly once through base.css. Found ${visualImports.length}.`);
  }
}

function checkInjectedClassTokens(file, content) {
  if (!file.endsWith(".js")) {
    return;
  }

  const classPatterns = [
    /className\s*=\s*["'`]([^"'`$]+)["'`]/g,
    /classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g,
  ];

  for (const pattern of classPatterns) {
    for (const match of content.matchAll(pattern)) {
      const rawClassText = match[1];
      const tokens = Array.from(rawClassText.matchAll(/["'`]([^"'`$]+)["'`]/g))
        .flatMap((tokenMatch) => tokenMatch[1].split(/\s+/))
        .concat(rawClassText.split(/\s+/))
        .map((token) => token.trim())
        .filter(Boolean);

      for (const token of tokens) {
        if (forbiddenInjectedClassTokens.has(token)) {
          addError(
            file,
            `CLASS NAME CONTROL: JS must not inject generic class "${token}". Use a domain-prefixed class.`,
            lineOf(content, match.index),
          );
        }
      }
    }
  }
}

function checkAuthLayoutDiscipline(file, content) {
  if (rel(file) !== "src/shared/ui/styles/auth.css") {
    return;
  }

  for (const match of content.matchAll(/@media\b/g)) {
    addError(file, "LAYOUT DISCIPLINE: auth.css must not define breakpoints. Use core/layout.css.", lineOf(content, match.index));
  }

  for (const match of content.matchAll(/\bdisplay\s*:\s*grid\b|\bgrid-template-[\w-]+\s*:|\bgrid-column\s*:|\bgrid-area\s*:/g)) {
    addError(file, "LAYOUT DISCIPLINE: auth.css must not own grid layout behavior. Use core/layout.css.", lineOf(content, match.index));
  }

  for (const match of content.matchAll(/\bposition\s*:\s*absolute\b/g)) {
    addError(file, "LAYOUT DISCIPLINE: absolute positioning is forbidden in auth.css layout.", lineOf(content, match.index));
  }

  for (const match of content.matchAll(/\bmargin-(?:top|bottom)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
    if (Number(match[1]) > 24) {
      addError(file, "LAYOUT DISCIPLINE: large vertical margins are forbidden. Use container gap tokens.", lineOf(content, match.index));
    }
  }
}

function checkLayoutClassDiscipline(file, content) {
  const relativePath = rel(file);
  const extension = relativePath.split(".").pop();
  const layoutClassPattern = extension === "css"
    ? /\.layout-[a-z0-9-]+\b/g
    : /\blayout-[a-z0-9-]+\b/g;
  const layoutClassMatches = Array.from(content.matchAll(layoutClassPattern));

  for (const match of layoutClassMatches) {
    const className = match[0].replace(/^\./, "");

    if (forbiddenLegacyLayoutClasses.has(className)) {
      addError(file, `LAYOUT DISCIPLINE: legacy layout class "${className}" is forbidden.`, lineOf(content, match.index));
      continue;
    }

    if (!allowedLayoutClassFiles.has(relativePath)) {
      addError(
        file,
        `LAYOUT DISCIPLINE: layout class "${className}" is only allowed in the layout system and approved Auth/Onboarding entry points.`,
        lineOf(content, match.index),
      );
      continue;
    }

    if (
      relativePath.endsWith(".js") &&
      !allowedInjectedLayoutClasses.has(className)
    ) {
      addError(
        file,
        `LAYOUT DISCIPLINE: JS may only inject approved layout density classes, not "${className}".`,
        lineOf(content, match.index),
      );
    }
  }
}

function checkAuthHtmlLayoutStructure(file, content) {
  const relativePath = rel(file);

  if (!authLayoutHtmlFiles.has(relativePath)) {
    return;
  }

  const layout2colMatches = Array.from(content.matchAll(/\blayout-2col\b/g));
  const contextMatches = Array.from(content.matchAll(/\bauth-context-side\b/g));
  const formMatches = Array.from(content.matchAll(/\bauth-form-side\b/g));

  if (layout2colMatches.length !== 1) {
    addError(file, "AUTH HTML LAYOUT: page must contain exactly one layout-2col root.");
  }

  if (contextMatches.length !== 1 || formMatches.length !== 1) {
    addError(file, "AUTH HTML LAYOUT: page must contain exactly one context side and one form side.");
    return;
  }

  const layoutIndex = layout2colMatches[0]?.index ?? -1;
  const contextIndex = contextMatches[0].index;
  const formIndex = formMatches[0].index;

  if (layoutIndex > contextIndex || layoutIndex > formIndex) {
    addError(file, "AUTH HTML LAYOUT: context/form sides must live inside the layout-2col root.");
  }

  if (contextIndex > formIndex) {
    addError(file, "AUTH HTML LAYOUT: context side must appear before form side in HTML; CSS layout areas own visual placement.");
  }

  if (!/\bauth-context-side\b[^"]*\blayout-context\b[^"]*\blayout-center\b[^"]*\blayout-hide-mobile\b/.test(content)) {
    addError(file, "AUTH HTML LAYOUT: context side must use auth-context-side layout-context layout-center layout-hide-mobile.");
  }

  if (!/\bauth-form-side\b[^"]*\blayout-form\b[^"]*\blayout-center\b/.test(content)) {
    addError(file, "AUTH HTML LAYOUT: form side must use auth-form-side layout-form layout-center.");
  }

  if (/<[^>]+class="[^"]*\blayout-2col\b[^"]*\blayout-full-height\b[^"]*"/.test(content)) {
    addError(file, "AUTH HTML LAYOUT: layout-full-height belongs on the shell only, not the 2-column layout.");
  }
}

if (existsSync(resolve(stylesDir, "layout.css"))) {
  addError(resolve(stylesDir, "layout.css"), "layout.css must be removed from the project.");
}

for (const file of cssFiles) {
  const content = readFileSync(file, "utf8");
  const relativePath = rel(file);
  const isUtilities = relativePath === "src/shared/ui/styles/core/utilities.css";

  if (relativePath.endsWith("/components.css")) {
    addError(file, "components.css is ambiguous. Use a domain-owned file such as admin-components.css.");
  }

  if (relativePath.endsWith("/layout.css") && !isCoreLayoutCss(file)) {
    addError(file, "layout.css must be removed from the project.");
  }

  for (const match of content.matchAll(/!important/g)) {
    if (!isUtilities) {
      addError(file, "!important is only allowed in core/utilities.css.", lineOf(content, match.index));
    }
  }

  for (const match of content.matchAll(/data-label/g)) {
    addError(file, "CSS must not depend on data-label text.", lineOf(content, match.index));
  }

  if (
    /["'](?:\.\/|\.\.\/)*core\/layout\.css["']|["'](?:\.\/|\.\.\/)*layout\.css["']/.test(content) &&
    relativePath !== "src/shared/ui/styles/base.css" &&
    !isCoreLayoutCss(file)
  ) {
    addError(file, "Do not import or depend on layout.css.");
  }

  checkCssImportBoundary(file, content);
  checkVisualOwnership(file, content);
  checkAuthLayoutDiscipline(file, content);
  checkLayoutClassDiscipline(file, content);

  if (relativePath.endsWith("/store.css") && /\badmin-/.test(content)) {
    addError(file, "NO CROSS DOMAIN: store.css must not reference admin-* selectors.");
  }

  if (/src\/shared\/ui\/styles\/admin[^/]*\.css$/.test(relativePath) && /(?<!admin-)store-/.test(content)) {
    addError(file, "NO CROSS DOMAIN: admin CSS must not reference store-* selectors.");
  }

  for (const block of getSelectorBlocks(content)) {
    const selectors = block.selector
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);

    for (const selector of selectors) {
      if (/^(table|td|th)(?:$|[\s.#[:>+~])/.test(selector)) {
        addError(file, `Global table selector is forbidden: "${selector}".`, lineOf(content, block.index));
      }

      if (/^\.(btn|card|table)(?:$|[\s.#[:>+~])/.test(selector)) {
        addError(file, `Global primitive selector is forbidden: "${selector}".`, lineOf(content, block.index));
      }
    }
  }
}

const scannedFiles = [resolve(rootDir, "index.html")];

for (const dir of scanDirs) {
  scannedFiles.push(...walk(dir, (path) => /\.(html|js|css)$/.test(path)));
}

checkVisualCssImportBoundary(scannedFiles);

for (const file of scannedFiles) {
    const content = readFileSync(file, "utf8");
    checkCssImportBoundary(file, content);
    checkInjectedClassTokens(file, content);
    checkVisualOwnership(file, content);
    checkLayoutClassDiscipline(file, content);
    checkAuthHtmlLayoutStructure(file, content);
    for (const match of content.matchAll(/<style\b|style=/g)) {
      addError(file, "Inline CSS is forbidden.", lineOf(content, match.index));
    }
}

if (errors.length > 0) {
  console.error("CSS ownership check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("CSS ownership check passed.");
