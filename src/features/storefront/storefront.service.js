import { buildContactLink, generateMessage } from "../../core/channel-engine.js";
import { hasSupabaseConfig, rpc } from "../../core/api/client.js";
import { normalizePhoneNumber } from "../../core/site-settings.js";
import { getStoreSlugFromPath, loadStorefrontContext } from "../../core/tenant-context.js";
import { guardBackendOperation } from "../../core/runtime/runtime-guard.js";
import { createOrder } from "../order/order.service.js";
import { validateTrackingPayload } from "./storefront.validation.js";

export {
  buildContactLink,
  createOrder,
  generateMessage,
  getStoreSlugFromPath,
  hasSupabaseConfig,
  loadStorefrontContext,
  normalizePhoneNumber,
};

export function trackProductClick(payload) {
  return guardBackendOperation(
    () => rpc("track_product_click", validateTrackingPayload(payload)),
    { event: "DB_PRODUCT_CLICK_TRACK" },
  );
}

export function trackSiteVisit(payload) {
  return guardBackendOperation(
    () => rpc("track_site_visit", validateTrackingPayload(payload)),
    { event: "DB_SITE_VISIT_TRACK" },
  );
}
