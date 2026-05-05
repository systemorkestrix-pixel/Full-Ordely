import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { RULES } from "../system/governor.config.js";

if (!RULES.DATA) {
  console.log("Data layer check skipped.");
  process.exit(0);
}

const rootDir = process.cwd();
const migrationDir = resolve(rootDir, "migrations/20260425_site_settings");
const errors = [];
const tenantTables = ["tenants", "categories", "products", "site_settings", "orders", "site_stats"];
const tenantScopedTables = ["categories", "products", "site_settings", "orders", "site_stats"];

function addError(message) {
  errors.push(`DATA GOVERNOR: ${message}`);
}

const migrationSql = readdirSync(migrationDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((firstFile, secondFile) => firstFile.localeCompare(secondFile))
  .map((fileName) => readFileSync(join(migrationDir, fileName), "utf8"))
  .join("\n\n")
  .toLowerCase();

if (!statSync(migrationDir, { throwIfNoEntry: false })?.isDirectory()) {
  addError("migration directory is missing.");
}

for (const table of tenantTables) {
  if (!migrationSql.includes(`alter table public.${table} enable row level security`)) {
    addError(`public.${table} must enable row level security.`);
  }

  if (!migrationSql.includes(`alter table public.${table}`) || !migrationSql.includes("created_by")) {
    addError(`public.${table} must carry audit ownership columns.`);
  }

  if (!migrationSql.includes(`set_${table}_updated_at`) && table !== "data_access_logs") {
    addError(`public.${table} must have updated_at trigger coverage.`);
  }
}

for (const table of tenantScopedTables) {
  const policyPattern = new RegExp(`create\\s+policy\\s+[^;]+on\\s+public\\.${table}[\\s\\S]+tenant_id\\s*=\\s*public\\.current_tenant_id\\(\\)`);
  if (!policyPattern.test(migrationSql)) {
    addError(`public.${table} must have tenant isolation policy.`);
  }
}

if (!migrationSql.includes("create table if not exists public.data_access_logs")) {
  addError("data_access_logs table is required.");
}

if (!migrationSql.includes("create or replace function public.audit_data_change()")) {
  addError("audit_data_change trigger function is required.");
}

if (!migrationSql.includes("create or replace function public.set_created_by()")) {
  addError("set_created_by trigger function is required.");
}

const requiredConstraints = [
  "categories_name_not_empty",
  "products_name_not_empty",
  "products_category_not_empty",
  "site_settings_phone_number_format",
  "orders_customer_phone_format",
  "orders_quantity_range",
  "site_stats_total_visits_non_negative",
];

for (const constraintName of requiredConstraints) {
  if (!migrationSql.includes(constraintName)) {
    addError(`missing required constraint ${constraintName}.`);
  }
}

if (errors.length > 0) {
  console.error("Data layer check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Data layer check passed.");
