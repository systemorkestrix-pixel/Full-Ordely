import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.BACKEND) {
  console.log("Backend boundary check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const errors = [];
const tenantScopedTables = new Set(["categories", "orders", "products", "site_settings", "site_stats"]);

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

function hasSibling(file, suffix) {
  const baseName = basename(file).replace(/\.service\.js$/, "");
  return statSync(resolve(dirname(file), `${baseName}.${suffix}.js`), { throwIfNoEntry: false })?.isFile();
}

const srcFiles = walk(resolve(rootDir, "src"), (path) => path.endsWith(".js"));

for (const file of srcFiles) {
  const relativePath = rel(file);
  const content = readFileSync(file, "utf8");
  const isCoreApiFile = relativePath === "src/core/api.js" || relativePath.startsWith("src/core/api/");

  if (!isCoreApiFile) {
    for (const match of content.matchAll(/@supabase\/supabase-js|\bcreateClient\b|\bsupabase\s*\./g)) {
      addError(file, "BACKEND GOVERNOR: Supabase is locked to src/core/api/.", lineOf(content, match.index));
    }
  }

  if (relativePath.startsWith("src/apps/")) {
    for (const match of content.matchAll(/\bdb\s*\.\s*from\s*\(|\brequireClient\s*\(\s*\)\s*\.\s*from\s*\(|\brpc\s*\(|\bstorageFrom\s*\(|\bstorage\s*\.\s*from\b/g)) {
      addError(file, "BACKEND GOVERNOR: apps must not call DB/API primitives directly.", lineOf(content, match.index));
    }
  }
}

for (const file of walk(resolve(rootDir, "src/features"), (path) => path.endsWith(".service.js"))) {
  const content = readFileSync(file, "utf8");
  const relativePath = rel(file);
  const isCompatibilityAdapter = /export\s*\{[\s\S]*\}\s*from\s+["'][^"']+\.service\.js["'];?/.test(content.trim());

  if (!isCompatibilityAdapter && !hasSibling(file, "validation")) {
    addError(file, "BACKEND GOVERNOR: service files with data access need a sibling validation layer.");
  }

  if (!isCompatibilityAdapter && !hasSibling(file, "mapper")) {
    addError(file, "BACKEND GOVERNOR: service files with data access need a sibling mapper layer.");
  }

  for (const table of tenantScopedTables) {
    if (!content.includes(`from("${table}")`) && !content.includes(`from('${table}')`)) continue;
    if (!/\benforceTenant\b|\bbyTenant\b|\binsertTenantRow\b|\bupdateTenantRow\b|\bdeleteTenantRow\b|\bupsertTenantRow\b/.test(content)) {
      addError(file, `BACKEND GOVERNOR: ${table} access must pass through tenant guard.`);
    }
  }

  if (/from\s+["'][^"']*core\/api\.js["']/.test(content) && !/getSession|hasSupabaseConfig|sign|Auth|onAuthStateChange/.test(content)) {
    addError(file, "BACKEND GOVERNOR: domain DB services must use core/api builders, not the legacy adapter.");
  }

  if (relativePath.includes("/admin/") && /\bstorageFrom\s*\(/.test(content) && !content.includes("uploadImage")) {
    addError(file, "BACKEND GOVERNOR: storage access must stay wrapped in named service mutations.");
  }
}

for (const file of walk(resolve(rootDir, "src/apps"), (path) => path.endsWith(".js"))) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/\bfunction\s+validate[A-Z]|\bconst\s+[A-Z_]*REGEX\b/g)) {
    addError(file, "BACKEND GOVERNOR: domain validation belongs in src/features/*/*.validation.js.", lineOf(content, match.index));
  }
}

if (errors.length > 0) {
  console.error("Backend boundary check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Backend boundary check passed.");
