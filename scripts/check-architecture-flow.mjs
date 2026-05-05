import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.FLOW) {
  console.log("Architecture flow check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const errors = [];
const allowedAppFiles = new Set([
  "admin.actions.js",
  "admin.copy.js",
  "admin.dependencies.js",
  "admin.events.js",
  "admin.form-actions.js",
  "admin.js",
  "admin.render.js",
  "admin.routes.js",
  "admin.runtime.js",
  "admin.state.js",
  "admin.validation.js",
  "auth.copy.js",
  "auth.js",
  "auth.state.js",
  "entry.js",
  "entry.state.js",
  "demo-store.js",
  "landing.js",
  "onboarding.js",
  "onboarding.state.js",
  "store.copy.js",
  "store.js",
  "store.state.js",
]);
const allowedSharedStateFiles = new Set(["create-state-store.js"]);
const allowedLoginFiles = new Set([
  "src/apps/auth/auth.js",
  "src/core/api.js",
  "src/core/api/client.js",
  "src/features/auth/auth.service.js",
]);
const allowedRoles = new Set([
  "entry",
  "runtime",
  "state",
  "events",
  "actions",
  "render",
  "validation",
  "routes",
  "dependencies",
  "copy",
  "service",
  "ui",
]);
const sourceFiles = walk(resolve(rootDir, "src"), (path) => path.endsWith(".js"));

function walk(dir, predicate = () => true) {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

function rel(path) {
  return relative(rootDir, path).replaceAll(sep, "/");
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function addError(path, message, lineNumber = 1) {
  errors.push(`${rel(path)}:${lineNumber} - ${message}`);
}

function getAppRole(fileName) {
  if (fileName.endsWith(".runtime.js")) return "runtime";
  if (fileName.endsWith(".state.js")) return "state";
  if (fileName.endsWith(".events.js")) return "events";
  if (fileName.endsWith(".actions.js") || fileName.endsWith(".form-actions.js")) return "actions";
  if (fileName.endsWith(".render.js")) return "render";
  if (fileName.endsWith(".validation.js")) return "validation";
  if (fileName.endsWith(".routes.js")) return "routes";
  if (fileName.endsWith(".dependencies.js")) return "dependencies";
  if (fileName.endsWith(".copy.js")) return "copy";
  return "entry";
}

function assertKnownPattern(file, role) {
  if (!RULES.NO_NEW_PATTERNS) return;
  if (!allowedRoles.has(role)) {
    addError(file, `FLOW GOVERNOR: unknown architecture role "${role}" is forbidden.`);
  }
}

function assertNoMatches(file, content, pattern, message) {
  for (const match of content.matchAll(pattern)) {
    addError(file, message, lineOf(content, match.index));
  }
}

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  const relativePath = rel(file);
  if (!allowedLoginFiles.has(relativePath)) {
    assertNoMatches(
      file,
      content,
      /\bsignInWithPassword\b/g,
      "FLOW GOVERNOR: login is allowed only through the intent-based Auth gateway.",
    );
  }
  assertNoMatches(
    file,
    content,
    /catch\s*\([^)]*\)\s*\{\s*\}|\.catch\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{\s*\}\s*\)/g,
    "FLOW GOVERNOR: silent failures are forbidden; log or handle every caught error.",
  );
}

for (const file of walk(resolve(rootDir, "src/apps"), (path) => path.endsWith(".js"))) {
  const fileName = basename(file);
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");
  const role = getAppRole(fileName);

  assertKnownPattern(file, role);

  if (RULES.NO_NEW_PATTERNS && !allowedAppFiles.has(fileName)) {
    addError(file, "FLOW GOVERNOR: new app JS files require an existing approved role/pattern.");
  }

  if (role === "events") {
    assertNoMatches(
      file,
      content,
      /from\s+["'][^"']*(?:features|core|shared\/state)\/|\bawait\b|\basync\b|\bd\.[A-Za-z_$]|\bsetState\s*\(/g,
      "FLOW GOVERNOR: events may only bind UI events and dispatch actions.",
    );
  }

  if (role === "actions") {
    assertNoMatches(
      file,
      content,
      /addEventListener|querySelector|getElementById|document\.createElement|innerHTML\s*=|classList\.(?:add|remove|toggle)/g,
      "FLOW GOVERNOR: actions orchestrate services/state/render; DOM construction belongs in render.",
    );
  }

  if (role === "render") {
    assertNoMatches(
      file,
      content,
      /\bawait\b|\basync\s+function\b|from\s+["'][^"']*(?:features|core)\/|\bfetch\s*\(|\bd\.[A-Za-z_$]/g,
      "FLOW GOVERNOR: render must stay synchronous and must not call services/API.",
    );
  }

  if (role === "state") {
    assertNoMatches(
      file,
      content,
      /addEventListener|from\s+["'][^"']*(?:features|core)\/|\bawait\b|\bfetch\s*\(/g,
      "FLOW GOVERNOR: state files define state only.",
    );
  }

  if (relativePath.includes("/admin/") && role === "entry") {
    assertNoMatches(
      file,
      content,
      /addEventListener|document\.|querySelector|getElementById|innerHTML|classList|\bfetch\s*\(/g,
      "FLOW GOVERNOR: admin entry files must delegate to runtime.",
    );
  }
}

for (const file of walk(resolve(rootDir, "src/features"), (path) => path.endsWith(".js"))) {
  const fileName = basename(file);
  const content = readFileSync(file, "utf8");
  const role = fileName.endsWith(".ui.js") ? "ui" : "service";

  assertKnownPattern(file, role);

  if (role === "service") {
    assertNoMatches(
      file,
      content,
      /\bdocument\.|\bwindow\.|querySelector|getElementById|innerHTML|classList/g,
      "FLOW GOVERNOR: services/features must not modify DOM.",
    );
  }
}

for (const file of walk(resolve(rootDir, "src/shared/state"), (path) => path.endsWith(".js"))) {
  const fileName = basename(file);
  if (RULES.NO_NEW_PATTERNS && !allowedSharedStateFiles.has(fileName)) {
    addError(file, "FLOW GOVERNOR: shared state may only use the approved create-state-store pattern.");
  }
}

if (errors.length > 0) {
  console.error("Architecture flow check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Architecture flow check passed.");
