import { requirePayloadObject } from "../../core/governor/validation-guard.js";
import { enforceTenant, enforceTenantPayload } from "../../core/governor/tenant-guard.js";

export function validateSettingsTenant(tenantId) {
  return enforceTenant(tenantId);
}

export function validateSettingsPayload(payload) {
  requirePayloadObject(payload, "INVALID_SETTINGS");
  enforceTenantPayload(payload);
  return payload;
}
