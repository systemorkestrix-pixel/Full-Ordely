import { createStateStore } from "../../shared/state/create-state-store.js";

const store = createStateStore({
  ui: {
    view: "setup",
    loading: false,
    error: null,
  },
  entities: {
    products: [],
    categories: [],
    orders: [],
  },
  session: {
    user: null,
    tenant: null,
  },
}, { label: "onboarding" });

export const state = store.state;
export const setState = store.setState;
export const runtimeGuard = store.runtimeGuard;
