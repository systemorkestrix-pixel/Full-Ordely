export function createAppError(code, message = code, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function normalizeError(error, fallbackCode = "BACKEND_ERROR") {
  if (!error) {
    return createAppError(fallbackCode);
  }

  if (error instanceof Error) {
    if (!error.code) error.code = fallbackCode;
    if (!error.details) error.details = {};
    return error;
  }

  if (typeof error === "object") {
    return createAppError(
      error.code || fallbackCode,
      error.message || fallbackCode,
      error.details || {},
    );
  }

  return createAppError(fallbackCode, String(error));
}

export function fail(code, message = code, details = {}) {
  throw createAppError(code, message, details);
}
