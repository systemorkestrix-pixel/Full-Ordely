import { normalizeError } from "../governor/error-guard.js";
import { enforceTenant } from "../governor/tenant-guard.js";
import { reportBackendGuard, trace } from "./trace.js";

const SLOW_QUERY_MS = 800;

export async function guardBackendOperation(task, {
  event = "DB_OPERATION",
  tenantId = null,
  requireTenant = false,
  allowEmpty = true,
} = {}) {
  if (requireTenant) {
    enforceTenant(tenantId);
  }

  const startedAt = performance.now();

  try {
    trace(`${event}_STARTED`, { tenantId });
    const result = await task();
    const duration = performance.now() - startedAt;

    if (duration > SLOW_QUERY_MS) {
      reportBackendGuard("warn", "Slow backend operation", { event, duration, tenantId });
    }

    if (!allowEmpty && !result?.error) {
      const data = result?.data;
      const isEmptyArray = Array.isArray(data) && data.length === 0;
      if (data == null || isEmptyArray) {
        reportBackendGuard("warn", "Unexpected empty backend result", { event, tenantId });
      }
    }

    trace(`${event}_COMPLETED`, { tenantId, duration });
    return result;
  } catch (error) {
    const normalizedError = normalizeError(error);
    reportBackendGuard("error", "Backend operation failed", {
      event,
      tenantId,
      code: normalizedError.code,
      message: normalizedError.message,
    });
    throw normalizedError;
  }
}
