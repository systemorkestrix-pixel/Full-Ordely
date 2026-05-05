import { rpc } from "../../core/api/client.js";
import { from, runQuery } from "../../core/api/query-builder.js";
import { guardBackendOperation } from "../../core/runtime/runtime-guard.js";
import { mapTenant } from "./tenant.mapper.js";
import { validateTenantId, validateTenantPayload, validateTenantSlug } from "./tenant.validation.js";

export async function getTenantBySlug(slug) {
  const nextSlug = validateTenantSlug(slug);
  const result = await runQuery(
    from("tenants").select("*").eq("slug", nextSlug).maybeSingle(),
    { event: "DB_TENANT_BY_SLUG_FETCH", allowEmpty: false },
  );
  return { ...result, data: mapTenant(result.data) };
}

export async function getTenantByOwner(ownerUserId) {
  const result = await runQuery(
    from("tenants").select("*").eq("owner_user_id", ownerUserId).maybeSingle(),
    { event: "DB_TENANT_BY_OWNER_FETCH" },
  );
  return { ...result, data: mapTenant(result.data) };
}

export async function createTenant(payload) {
  const nextPayload = validateTenantPayload(payload);
  const result = await runQuery(
    from("tenants").insert([nextPayload]).select("*").single(),
    { event: "DB_TENANT_CREATE", allowEmpty: false },
  );
  return { ...result, data: mapTenant(result.data) };
}

export async function updateTenantSlug({ tenantId, ownerUserId, slug }) {
  validateTenantId(tenantId);
  const nextSlug = validateTenantSlug(slug);
  const result = await runQuery(
    from("tenants")
      .update({ slug: nextSlug })
      .eq("id", tenantId)
      .eq("owner_user_id", ownerUserId)
      .select("*")
      .maybeSingle(),
    { event: "DB_TENANT_SLUG_UPDATE", tenantId, requireTenant: true },
  );
  return { ...result, data: mapTenant(result.data) };
}

export function provisionTenantContext(payload) {
  return guardBackendOperation(
    () => rpc("provision_tenant_context", payload),
    { event: "DB_TENANT_CONTEXT_PROVISION", allowEmpty: false },
  );
}

export function validateTenantIdentityConflicts(payload) {
  return guardBackendOperation(
    () => rpc("validate_tenant_identity_conflicts", payload),
    { event: "DB_TENANT_IDENTITY_VALIDATE" },
  );
}

export function getStorefrontBySlug(storeSlug) {
  const normalizedSlug = validateTenantSlug(storeSlug);
  return guardBackendOperation(
    () => rpc("get_storefront", { store_slug: normalizedSlug }),
    { event: "DB_STOREFRONT_BY_SLUG_FETCH", allowEmpty: false },
  );
}
