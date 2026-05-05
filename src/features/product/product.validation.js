import { requireFiniteNumber, requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";
import { enforceTenantPayload } from "../../core/governor/tenant-guard.js";

export function validateProductPayload(payload) {
  requirePayloadObject(payload, "INVALID_PRODUCT");
  enforceTenantPayload(payload);

  return {
    ...payload,
    name: requireString(payload.name, "INVALID_PRODUCT_NAME", { min: 2, max: 120 }),
    price: requireFiniteNumber(payload.price, "INVALID_PRODUCT_PRICE", { min: 0.01 }),
    category: requireString(payload.category, "INVALID_PRODUCT_CATEGORY", { min: 1, max: 120 }),
    is_available: payload.is_available ?? true,
    image_url: String(payload.image_url || "").trim(),
  };
}

export function validateProductPatch(payload) {
  requirePayloadObject(payload, "INVALID_PRODUCT");
  const patch = { ...payload };

  if ("name" in patch) {
    patch.name = requireString(patch.name, "INVALID_PRODUCT_NAME", { min: 2, max: 120 });
  }

  if ("price" in patch) {
    patch.price = requireFiniteNumber(patch.price, "INVALID_PRODUCT_PRICE", { min: 0.01 });
  }

  if ("category" in patch) {
    patch.category = requireString(patch.category, "INVALID_PRODUCT_CATEGORY", { min: 1, max: 120 });
  }

  if ("image_url" in patch) {
    patch.image_url = String(patch.image_url || "").trim();
  }

  return patch;
}
