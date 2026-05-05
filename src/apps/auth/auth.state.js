import { createStateStore } from "../../shared/state/create-state-store.js";

const store = createStateStore({
  ui: {
    view: "form",
    loading: false,
    error: null,
    mode: "signup",
    cachedEmail: "",
    cachedPassword: "",
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
}, { label: "auth" });

export const state = store.state;
export const setState = store.setState;
export const runtimeGuard = store.runtimeGuard;
