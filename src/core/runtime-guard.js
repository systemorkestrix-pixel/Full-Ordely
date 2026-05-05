const isDevRuntime = Boolean(import.meta.env?.DEV);
const proxyToTarget = new WeakMap();

function report(level, message, details) {
  if (!isDevRuntime) return;
  const logger = level === "error" ? console.error : console.warn;
  logger(`[Runtime Guard] ${message}`, details || "");
}

export function trace(event, payload = {}) {
  if (!isDevRuntime) return;
  console.log(`[TRACE] ${event}`, payload);
}

export function unwrapRuntimeValue(value) {
  return proxyToTarget.get(value) || value;
}

export function guardStateAccess(target, key, path = "state") {
  if (!isDevRuntime || typeof key === "symbol" || key in target) return;
  const depth = path.split(".").length;
  if (depth <= 2) {
    report("warn", `Invalid state access: ${path}.${String(key)}`);
  }
}

export function createRuntimeGuard(label = "app") {
  let mutationDepth = 0;
  const proxyCache = new WeakMap();
  const eventCounts = new Map();
  const renderCounts = new Map();

  function guardObject(target, path = "state") {
    if (!isDevRuntime || !target || typeof target !== "object") return target;
    if (proxyCache.has(target)) return proxyCache.get(target);

    const proxy = new Proxy(target, {
      get(currentTarget, key, receiver) {
        guardStateAccess(currentTarget, key, path);
        const value = Reflect.get(currentTarget, key, receiver);
        const nextPath = typeof key === "symbol" ? path : `${path}.${String(key)}`;
        return guardObject(value, nextPath);
      },
      set(currentTarget, key, value, receiver) {
        if (mutationDepth === 0) {
          report("error", `Direct state mutation outside setState: ${path}.${String(key)}`, value);
        }
        return Reflect.set(currentTarget, key, unwrapRuntimeValue(value), receiver);
      },
      deleteProperty(currentTarget, key) {
        if (mutationDepth === 0) {
          report("error", `Direct state delete outside setState: ${path}.${String(key)}`);
        }
        return Reflect.deleteProperty(currentTarget, key);
      },
    });

    proxyCache.set(target, proxy);
    proxyToTarget.set(proxy, target);
    return proxy;
  }

  function runStateMutation(task) {
    mutationDepth += 1;
    try {
      return task();
    } finally {
      mutationDepth -= 1;
    }
  }

  function logStateUpdate(partial) {
    trace("STATE_UPDATED", { scope: label, slices: Object.keys(partial || {}) });
  }

  function trackEvent(eventName, limit = 12, intervalMs = 1000) {
    if (!isDevRuntime) return;
    const now = performance.now();
    const eventState = eventCounts.get(eventName) || { count: 0, startedAt: now };
    const elapsed = now - eventState.startedAt;
    if (elapsed > intervalMs) {
      eventState.count = 0;
      eventState.startedAt = now;
    }
    eventState.count += 1;
    eventCounts.set(eventName, eventState);
    if (eventState.count > limit) {
      report("warn", `Event spam detected: ${eventName}`, { count: eventState.count, intervalMs });
    }
  }

  function measureRender(renderName, renderTask) {
    const start = isDevRuntime ? performance.now() : 0;
    try {
      return renderTask();
    } finally {
      if (isDevRuntime) {
        const duration = performance.now() - start;
        const renderState = renderCounts.get(renderName) || { count: 0, startedAt: start };
        if (start - renderState.startedAt > 1000) {
          renderState.count = 0;
          renderState.startedAt = start;
        }
        renderState.count += 1;
        renderCounts.set(renderName, renderState);
        if (duration > 16) report("warn", `Slow render: ${renderName}`, { duration });
        if (renderState.count > 30) report("warn", `Render loop suspected: ${renderName}`, renderState);
      }
    }
  }

  function assert(condition, message, details) {
    if (!condition) report("error", message, details);
  }

  function assertUiConsistency(scope, selectors) {
    if (!isDevRuntime || typeof document === "undefined") return;
    for (const selector of selectors) {
      if (!document.querySelector(selector)) {
        report("error", `UI consistency broken in ${scope}: missing ${selector}`);
      }
    }
  }

  return {
    assert,
    assertUiConsistency,
    guardObject,
    logStateUpdate,
    measureRender,
    runStateMutation,
    trackEvent,
    trace,
  };
}
