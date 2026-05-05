const isDevRuntime = Boolean(import.meta.env?.DEV);

export function trace(event, payload = {}) {
  if (!isDevRuntime) return;
  console.log(`[TRACE] ${event}`, payload);
}

export function reportBackendGuard(level, message, details = {}) {
  if (!isDevRuntime) return;
  const logger = level === "error" ? console.error : console.warn;
  logger(`[Backend Guard] ${message}`, details);
}
