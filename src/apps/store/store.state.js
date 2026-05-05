import { createStateStore } from "../../shared/state/create-state-store.js";

const store = createStateStore({
  ui: {
    view: null,
    loading: false,
    error: null,
    activeCategory: null,
    currentOrderProduct: null,
  },
  entities: {
    products: [],
    categories: [],
    orders: [],
    siteSettings: {},
  },
  session: {
    user: null,
    tenant: null,
  },
}, { label: "store" });

export const state = store.state;
export const setState = store.setState;
export const runtimeGuard = store.runtimeGuard;
