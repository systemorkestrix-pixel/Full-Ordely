import { requireClient } from "./client.js";
import { enforceTenant } from "../governor/tenant-guard.js";
import { enforceKnownTable } from "../governor/query-guard.js";
import { guardBackendOperation } from "../runtime/runtime-guard.js";

export function from(table) {
  return requireClient().from(enforceKnownTable(table));
}

export function byTenant(query, tenantId) {
  enforceTenant(tenantId);
  return query.eq("tenant_id", tenantId);
}

export function byId(query, id) {
  if (!id) {
    throw new Error("id_required");
  }

  return query.eq("id", id);
}

export function runQuery(query, meta = {}) {
  return guardBackendOperation(() => query, {
    event: meta.event || "DB_QUERY",
    tenantId: meta.tenantId || null,
    requireTenant: Boolean(meta.requireTenant),
    allowEmpty: meta.allowEmpty !== false,
  });
}
