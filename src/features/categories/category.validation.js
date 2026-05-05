import { requireFiniteNumber, requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";
import { enforceTenantPayload } from "../../core/governor/tenant-guard.js";

export function validateCategoryPayload(payload) {
  requirePayloadObject(payload, "INVALID_CATEGORY");
  enforceTenantPayload(payload);

  const nextPayload = {
    ...payload,
    name: requireString(payload.name, "INVALID_CATEGORY_NAME", { min: 2, max: 80 }),
    icon: requireString(payload.icon, "INVALID_CATEGORY_ICON", { min: 1, max: 16 }),
  };

  if ("order_index" in payload) {
    nextPayload.order_index = Math.trunc(requireFiniteNumber(payload.order_index, "INVALID_CATEGORY_ORDER", { min: 0 }));
  }

  return nextPayload;
}

export function validateCategoryPatch(payload) {
  requirePayloadObject(payload, "INVALID_CATEGORY");
  const patch = { ...payload };

  if ("name" in patch) {
    patch.name = requireString(patch.name, "INVALID_CATEGORY_NAME", { min: 2, max: 80 });
  }

  if ("icon" in patch) {
    patch.icon = requireString(patch.icon, "INVALID_CATEGORY_ICON", { min: 1, max: 16 });
  }

  if ("order_index" in patch) {
    patch.order_index = Math.trunc(requireFiniteNumber(patch.order_index, "INVALID_CATEGORY_ORDER", { min: 0 }));
  }

  return patch;
}
