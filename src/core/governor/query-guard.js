import { fail } from "./error-guard.js";
import { enforceTenant } from "./tenant-guard.js";

const TENANT_SCOPED_TABLES = new Set([
  "categories",
  "orders",
  "products",
  "site_settings",
  "site_stats",
]);

export function enforceKnownTable(table) {
  const normalizedTable = String(table || "").trim();
  if (!normalizedTable) {
    fail("TABLE_REQUIRED", "Table required");
  }

  return normalizedTable;
}

export function enforceTenantScopedQuery(table, tenantId) {
  const normalizedTable = enforceKnownTable(table);
  if (TENANT_SCOPED_TABLES.has(normalizedTable)) {
    enforceTenant(tenantId);
  }

  return normalizedTable;
}

export function isTenantScopedTable(table) {
  return TENANT_SCOPED_TABLES.has(String(table || "").trim());
}
