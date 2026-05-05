import { from, runQuery } from "./query-builder.js";
import { enforceTenant } from "../governor/tenant-guard.js";
import { requirePayloadObject } from "../governor/validation-guard.js";

export function insertTenantRow(table, payload, meta = {}) {
  requirePayloadObject(payload);
  enforceTenant(payload.tenant_id);
  return runQuery(
    from(table).insert([payload]).select("*").single(),
    {
      event: meta.event || "DB_INSERT",
      tenantId: payload.tenant_id,
      requireTenant: true,
      allowEmpty: false,
    },
  );
}

export function updateTenantRow(table, { id, tenantId, payload }, meta = {}) {
  requirePayloadObject(payload);
  enforceTenant(tenantId);
  return runQuery(
    from(table).update(payload).eq("id", id).eq("tenant_id", tenantId).select("*").maybeSingle(),
    {
      event: meta.event || "DB_UPDATE",
      tenantId,
      requireTenant: true,
    },
  );
}

export function deleteTenantRow(table, { id, tenantId }, meta = {}) {
  enforceTenant(tenantId);
  return runQuery(
    from(table).delete().eq("id", id).eq("tenant_id", tenantId),
    {
      event: meta.event || "DB_DELETE",
      tenantId,
      requireTenant: true,
    },
  );
}

export function upsertTenantRow(table, payload, options = {}, meta = {}) {
  requirePayloadObject(payload);
  enforceTenant(payload.tenant_id);
  return runQuery(
    from(table).upsert([payload], options).select("*").maybeSingle(),
    {
      event: meta.event || "DB_UPSERT",
      tenantId: payload.tenant_id,
      requireTenant: true,
    },
  );
}
