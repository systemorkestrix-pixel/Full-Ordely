import { requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";

export function validateStoreSlug(slug) {
  return requireString(slug, "STORE_SLUG_REQUIRED", { min: 1, max: 60 });
}

export function validateTrackingPayload(payload) {
  requirePayloadObject(payload, "INVALID_TRACKING_PAYLOAD");
  return payload;
}
