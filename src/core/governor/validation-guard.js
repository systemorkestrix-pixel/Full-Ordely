import { fail } from "./error-guard.js";

export function requirePayloadObject(payload, code = "INVALID_PAYLOAD") {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(code, "Payload must be an object");
  }

  return payload;
}

export function requireString(value, code, { min = 1, max = 255 } = {}) {
  const normalized = String(value || "").trim();
  if (normalized.length < min || normalized.length > max) {
    fail(code, code, { min, max });
  }

  return normalized;
}

export function requireFiniteNumber(value, code, { min = Number.NEGATIVE_INFINITY } = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < min) {
    fail(code, code, { min });
  }

  return numericValue;
}
