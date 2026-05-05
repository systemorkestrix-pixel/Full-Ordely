export function assertConfigured(condition, message = 'configuration_missing') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertTenant(tenant) {
  if (!tenant?.id) {
    throw new Error('tenant_context_missing');
  }
}

export function safeNextPath(value, fallback = '/admin') {
  return String(value || '').startsWith('/') ? value : fallback;
}
