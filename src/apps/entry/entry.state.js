import { createStateStore } from "../../shared/state/create-state-store.js";

const store = createStateStore({
  ui: {
    view: "loading",
  },
  session: {
    user: null,
  },
}, { label: "entry" });

export const state = store.state;
export const setState = store.setState;
export const runtimeGuard = store.runtimeGuard;
