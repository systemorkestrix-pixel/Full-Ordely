import { fail } from "./error-guard.js";

export function enforceTenant(tenantId) {
  if (!tenantId) {
    fail("TENANT_REQUIRED", "Tenant required");
  }

  return tenantId;
}

export function enforceTenantPayload(payload) {
  enforceTenant(payload?.tenant_id);
  return payload;
}
