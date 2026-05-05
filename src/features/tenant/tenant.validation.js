import { requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";
import { enforceTenant } from "../../core/governor/tenant-guard.js";

export function validateTenantSlug(slug) {
  const nextSlug = requireString(slug, "INVALID_TENANT_SLUG", { min: 1, max: 60 });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
    throw new Error("invalid_tenant_slug");
  }

  return nextSlug;
}

export function validateTenantPayload(payload) {
  requirePayloadObject(payload, "INVALID_TENANT");
  return {
    ...payload,
    owner_user_id: requireString(payload.owner_user_id, "OWNER_REQUIRED", { min: 1, max: 120 }),
    slug: validateTenantSlug(payload.slug),
  };
}

export function validateTenantId(tenantId) {
  return enforceTenant(tenantId);
}
