import { createRuntimeGuard, unwrapRuntimeValue } from "../../core/runtime-guard.js";

function unwrapStateValue(value) {
  return unwrapRuntimeValue(value);
}

function mergeState(target, partial) {
  for (const [key, value] of Object.entries(partial || {})) {
    const nextValue = unwrapStateValue(value);
    if (
      nextValue &&
      typeof nextValue === "object" &&
      !Array.isArray(nextValue) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      mergeState(target[key], nextValue);
    } else {
      target[key] = nextValue;
    }
  }
}

export function createStateStore(initialState, { label = "state" } = {}) {
  const runtimeGuard = createRuntimeGuard(label);
  const rawState = structuredClone(initialState);
  const state = runtimeGuard.guardObject(rawState);

  function setState(partial) {
    runtimeGuard.runStateMutation(() => mergeState(rawState, partial));
    runtimeGuard.logStateUpdate(partial);
    return state;
  }

  return {
    runtimeGuard,
    state,
    setState,
  };
}
