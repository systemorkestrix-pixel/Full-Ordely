import { rpc } from "../../core/api/client.js";
import { updateTenantRow } from "../../core/api/mutation-builder.js";
import { byTenant, from, runQuery } from "../../core/api/query-builder.js";
import { enforceTenant } from "../../core/governor/tenant-guard.js";
import { guardBackendOperation } from "../../core/runtime/runtime-guard.js";
import { mapOrders, mapOrder } from "./order.mapper.js";
import { validateCreateOrderPayload, validateOrderStatus } from "./order.validation.js";

export function createOrder(payload) {
  const nextPayload = validateCreateOrderPayload(payload);
  return guardBackendOperation(
    () => rpc("create_order", nextPayload),
    { event: "DB_ORDER_CREATE", allowEmpty: false },
  );
}

export async function getOrders(tenantId) {
  enforceTenant(tenantId);
  const result = await runQuery(
    byTenant(from("orders").select("*"), tenantId).order("created_at", { ascending: false }),
    { event: "DB_ORDERS_FETCH", tenantId, requireTenant: true },
  );

  return { ...result, data: mapOrders(result.data) };
}

export async function updateOrderStatus({ orderId, tenantId, status }) {
  const result = await updateTenantRow(
    "orders",
    { id: orderId, tenantId, payload: { status: validateOrderStatus(status) } },
    { event: "DB_ORDER_STATUS_UPDATE" },
  );
  return { ...result, data: mapOrder(result.data) };
}
