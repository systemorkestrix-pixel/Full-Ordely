import { requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";

const ORDER_STATUSES = new Set(["new", "processing", "completed", "cancelled"]);

export function validateOrderStatus(status) {
  const nextStatus = requireString(status, "INVALID_ORDER_STATUS", { min: 2, max: 40 });
  if (!ORDER_STATUSES.has(nextStatus)) {
    throw new Error("invalid_order_status");
  }

  return nextStatus;
}

export function validateCreateOrderPayload(payload) {
  requirePayloadObject(payload, "INVALID_ORDER");
  return {
    ...payload,
    store_slug: requireString(payload.store_slug, "STORE_SLUG_REQUIRED", { min: 1, max: 60 }),
    target_product_id: requireString(payload.target_product_id, "PRODUCT_REQUIRED", { min: 1, max: 120 }),
    customer_name_input: requireString(payload.customer_name_input, "CUSTOMER_NAME_REQUIRED", { min: 2, max: 120 }),
    customer_phone_input: requireString(payload.customer_phone_input, "CUSTOMER_PHONE_REQUIRED", { min: 6, max: 40 }),
    order_quantity: Number.parseInt(payload.order_quantity, 10) || 1,
  };
}
