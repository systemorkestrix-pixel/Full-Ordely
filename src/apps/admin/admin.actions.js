import { installAdminFormActions } from "./admin.form-actions.js";

export function installAdminActions(ctx) {
  const { TEXT, dependencies: d, elements: e, state: s, validation: v, render: r } = ctx;
  let authListenerBound = false;
  let dashboardLoadPromise = null;
  let lastSyncedSessionKey = "";

  function getStableSessionKey(session) {
    const userId = session?.user?.id || "";
    const confirmedAt = session?.user?.email_confirmed_at || session?.user?.confirmed_at || "";
    return userId ? `${userId}:${confirmedAt}` : "";
  }

  function runAdminAuthSync(task) {
    const nextPromise = Promise.resolve(s.authSyncPromise).then(task, task);
    ctx.setState({ ui: { authSyncPromise: nextPromise } });
    return nextPromise;
  }
  function sortCategories(list) {
    return [...list].sort((first, second) => {
      const firstOrder = Number(first.order_index) || 0;
      const secondOrder = Number(second.order_index) || 0;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return String(first.name || "").localeCompare(String(second.name || ""), "ar");
    });
  }
  function normalizeOrderValue(value) {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
  }
  async function getTenantIdentityConflicts(nextSlug, nextSettings) {
    const { data, error } = await d.validateTenantIdentityConflictsApi({
      target_tenant_id: s.currentTenant?.id || null,
      target_slug: nextSlug,
      target_phone_number: nextSettings.phone_number,
      target_google_maps_url: nextSettings.google_maps_url,
      target_whatsapp_url: nextSettings.whatsapp_url,
      target_messenger_url: nextSettings.messenger_url,
      target_telegram_url: nextSettings.telegram_url,
      target_facebook_url: nextSettings.facebook_url,
      target_instagram_url: nextSettings.instagram_url,
      target_tiktok_url: nextSettings.tiktok_url,
    });
    if (error) throw error;
    return data || {};
  }
  async function renderStoreQr(url) {
    const normalizedUrl = String(url || "").trim();
    if (s.isPreviewMode) {
      r.resetStoreQrUi({ displayUrl: new URL(`/s/${s.currentTenant?.slug || "my-store"}`, window.location.origin).toString(), showWarning: false });
      return;
    }
    if (!normalizedUrl) {
      r.resetStoreQrUi();
      return;
    }
    const renderToken = r.prepareStoreQrRender(normalizedUrl);
    try {
      const dataUrl = await d.generateQRCode(normalizedUrl);
      r.completeStoreQrRender(renderToken, normalizedUrl, dataUrl);
    } catch (error) {
      console.error("Error generating store QR code:", error);
      r.failStoreQrRender(renderToken);
    }
  }
  async function uploadImageToStorage(file, folderName) {
    if (!s.currentTenant?.id) throw new Error("tenant_context_missing");
    const fileExt = file.name.split(".").pop();
    const fileName = `${s.currentTenant.id}/${folderName}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await d.uploadImage({ fileName, file });
    if (uploadError) throw uploadError;
    return d.getImagePublicUrl(fileName);
  }

  async function fetchCategoriesFromSupabase() {
    let result = await d.getCategories(s.currentTenant.id);
    if (result.error && v.isMissingColumnError(result.error, "order_index")) {
      result = await d.getCategories(s.currentTenant.id, { ordered: false });
    }
    return result;
  }

  const fetchProductsFromSupabase = () => d.getProducts(s.currentTenant.id);
  const fetchOrdersFromSupabase = () => d.getOrders(s.currentTenant.id);

  async function fetchSiteSettingsFromSupabase() {
    const result = await d.getSettings(s.currentTenant.id);
    if (result.error) {
      if (v.isMissingSiteSettingsError(result.error)) {
        return v.normalizeAdminSiteSettings(ctx.DEFAULT_SITE_SETTINGS);
      }
      throw result.error;
    }
    return v.normalizeAdminSiteSettings(result.data || ctx.DEFAULT_SITE_SETTINGS);
  }

  async function fetchSiteStatsFromSupabase() {
    const result = await d.getSiteStats(s.currentTenant.id);
    if (result.error) throw result.error;
    return result.data || { total_visits: 0 };
  }

  async function runCategoryWrite(writeOperation, payload) {
    const nextPayload = { ...payload };
    let result = await writeOperation(nextPayload);
    while (result.error) {
      let handled = false;
      if (nextPayload.order_index !== void 0 && v.isMissingColumnError(result.error, "order_index")) {
        delete nextPayload.order_index;
        handled = true;
      }
      if (nextPayload.icon !== void 0 && v.isMissingColumnError(result.error, "icon")) {
        delete nextPayload.icon;
        handled = true;
      }
      if (!handled) break;
      result = await writeOperation(nextPayload);
    }
    return result;
  }

  function insertCategoryIntoSupabase(categoryName, orderIndex, icon) {
    return runCategoryWrite((payload) => d.createCategory(payload), {
      tenant_id: s.currentTenant.id,
      name: categoryName,
      order_index: orderIndex,
      icon,
    });
  }

  function updateCategoryInSupabase(categoryId, categoryName, orderIndex, icon) {
    return runCategoryWrite(
      (payload) => d.updateCategory({ categoryId, tenantId: s.currentTenant.id, payload }),
      { name: categoryName, order_index: orderIndex, icon },
    );
  }

  function startDashboardPolling() {
    if (s.dashboardRefreshTimer || !s.currentSession) return;
    ctx.setState({ ui: { dashboardRefreshTimer: window.setInterval(() => {
      loadDashboardData({ silent: true }).catch((error) => {
        console.error("Admin dashboard polling failed:", error);
      });
    }, 3e4) } });
  }

  function stopDashboardPolling() {
    if (!s.dashboardRefreshTimer) return;
    window.clearInterval(s.dashboardRefreshTimer);
    ctx.setState({ ui: { dashboardRefreshTimer: null } });
  }

  async function logoutAdmin() {
    await d.signOutUser();
    ctx.setState({ session: { user: null } });
    ctx.runtimeGuard.trace("ADMIN_LOGOUT", {});
    window.sessionStorage.removeItem(ctx.UNVERIFIED_SESSION_KEY);
    r.redirectToAuth();
  }

  function retryAdminSession() {
    if (!d.hasSupabaseConfig) {
      checkSession().catch((error) => console.error("Admin retry error:", error));
      return;
    }
    runAdminAuthSync(() => syncAdminSession(s.currentSession, {
      forceTenantReload: true,
      redirectOnMissingSession: true,
    })).catch((error) => console.error("Admin retry error:", error));
  }

  function handleAuthStateChange(eventName, session) {
    ctx.runtimeGuard.trace("ADMIN_AUTH_STATE_CHANGED", { eventName, hasSession: Boolean(session) });
    ctx.setState({ ui: { hasReceivedInitialAuthState: true } });
    const stableSessionKey = getStableSessionKey(session);
    const canReuseCurrentContext = Boolean(
      session &&
      stableSessionKey &&
      stableSessionKey === lastSyncedSessionKey &&
      s.currentTenant?.id,
    );
    if (canReuseCurrentContext && (eventName === "INITIAL_SESSION" || eventName === "TOKEN_REFRESHED")) {
      ctx.setState({ session: { user: session } });
      return;
    }
    lastSyncedSessionKey = stableSessionKey;
    runAdminAuthSync(() => syncAdminSession(session, {
      forceTenantReload: eventName === "SIGNED_IN",
      redirectOnMissingSession: true,
    })).catch((error) => {
      console.error("Error syncing auth tenant state:", error);
      r.showLogin({
        message: TEXT.accountVerifiedButAdminSetupFailed,
        feedback: TEXT.dashboardLoadError,
        tone: "error",
        showRetryAction: true,
        showLogoutAction: true,
      });
    });
  }

  function bindAuthStateListener() {
    if (!d.hasSupabaseConfig || authListenerBound) return;
    authListenerBound = true;
    d.onAuthStateChange((eventName, session) => handleAuthStateChange(eventName, session));
  }

  function editProduct(id) {
    const product = s.products.find((item) => String(item.id) === String(id));
    if (!product) return;
    ctx.setState({ draft: { editingProduct: product } });
    e.prodIdInput.value = product.id;
    e.prodName.value = product.name;
    e.prodPrice.value = product.price;
    e.currentImgUrl.textContent = product.image_url || TEXT.none;
    r.setButtonContent(e.btnSaveProduct, TEXT.saveChanges, "save");
    r.toggleHidden(e.btnCancelEdit, false);
    r.populateCategories(product.category);
    r.openProductEditor();
  }

  async function toggleProductAvailability(id) {
    const product = s.products.find((item) => String(item.id) === String(id));
    if (!product) return;
    const nextAvailability = !Boolean(product.is_available);
    try {
      const { error } = await d.updateProduct({
        productId: product.id,
        tenantId: s.currentTenant.id,
        payload: { is_available: nextAvailability },
      });
      if (error) throw error;
      ctx.runtimeGuard.trace("ADMIN_PRODUCT_AVAILABILITY_UPDATED", { productId: product.id, isAvailable: nextAvailability });
      await loadDashboardData({ silent: true });
      r.showSuccess(nextAvailability ? TEXT.availabilityEnabled : TEXT.availabilityDisabled);
    } catch (error) {
      console.error("Error toggling product availability:", error);
      r.showError(TEXT.saveProductError);
    }
  }

  async function deleteProduct(id) {
    const confirmed = await r.askConfirmation({
      title: TEXT.deleteProductTitle,
      message: TEXT.confirmDeleteProduct,
      confirmLabel: TEXT.delete,
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await d.deleteProductRecord({ productId: id, tenantId: s.currentTenant.id });
      if (error) throw error;
      ctx.runtimeGuard.trace("ADMIN_PRODUCT_DELETED", { productId: id });
      if (s.editingProduct && String(s.editingProduct.id) === String(id)) {
        r.resetProductForm();
        r.closeProductEditor({ reset: false });
      }
      await loadDashboardData({ silent: true });
      r.showSuccess(TEXT.productDeleted);
    } catch (error) {
      console.error("Error deleting product:", error);
      r.showError(TEXT.deleteProductError);
    }
  }

  function editCategory(id) {
    const category = s.categories.find((item) => String(item.id) === String(id));
    if (!category) return;
    ctx.setState({ draft: { editingCategory: category } });
    e.catIdInput.value = category.id;
    e.catNameInput.value = category.name;
    e.catIconInput.value = category.icon || "";
    e.catOrderInput.value = String(Number(category.order_index) || 0);
    r.setButtonContent(e.btnSaveCategory, TEXT.saveCategory, "save");
    r.toggleHidden(e.btnCancelCategoryEdit, false);
    r.openCategoryEditor();
  }

  async function deleteCategory(id) {
    const category = s.categories.find((item) => String(item.id) === String(id));
    if (!category) return;
    const usageCount = r.getCategoryUsageCount(category.name);
    if (usageCount > 0) {
      r.showWarning(TEXT.cannotDeleteCategory(category.name, usageCount));
      return;
    }
    const confirmed = await r.askConfirmation({
      title: TEXT.deleteCategoryTitle,
      message: TEXT.confirmDeleteCategory(category.name),
      confirmLabel: TEXT.delete,
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await d.deleteCategoryRecord({ categoryId: id, tenantId: s.currentTenant.id });
      if (error) throw error;
      ctx.runtimeGuard.trace("ADMIN_CATEGORY_DELETED", { categoryId: id });
      if (s.editingCategory && String(s.editingCategory.id) === String(id)) {
        r.resetCategoryForm();
        r.closeCategoryEditor({ reset: false });
      }
      await loadDashboardData({ silent: true });
      r.showSuccess(TEXT.categoryDeleted);
    } catch (error) {
      console.error("Error deleting category:", error);
      r.showError(TEXT.deleteCategoryError);
    }
  }

  async function updateOrderStatus(id, nextStatus) {
    const order = s.orders.find((item) => String(item.id) === String(id));
    if (!order) return;
    if (nextStatus === "cancelled") {
      const confirmed = await r.askConfirmation({
        title: TEXT.cancelOrderTitle,
        message: TEXT.cancelOrderMessage,
        confirmLabel: TEXT.cancelOrder,
        tone: "danger",
      });
      if (!confirmed) return;
    }
    try {
      const { error } = await d.updateOrderStatusRecord({
        orderId: order.id,
        tenantId: s.currentTenant.id,
        status: nextStatus,
      });
      if (error) throw error;
      ctx.runtimeGuard.trace("ADMIN_ORDER_STATUS_UPDATED", { orderId: order.id, status: nextStatus });
      await loadDashboardData({ silent: true });
      r.showSuccess(TEXT.orderUpdated);
    } catch (error) {
      console.error("Error updating order status:", error);
      r.showError(TEXT.dashboardLoadError);
    }
  }

  async function copyStoreLinkToClipboard() {
    if (s.isPreviewMode) return r.showWarning(TEXT.previewGateBlocked);
    if (!s.currentStorefrontUrl) return r.showWarning(TEXT.storeLinkRequired);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(s.currentStorefrontUrl);
    } else {
      r.copyTextToClipboardFallback(s.currentStorefrontUrl);
    }
    r.showSuccess(TEXT.storeLinkCopied);
  }

  function downloadStoreQrImage() {
    if (s.isPreviewMode) return r.showWarning(TEXT.previewGateBlocked);
    if (!s.currentStorefrontUrl || !s.currentStoreQrDataUrl) return r.showWarning(TEXT.storeLinkRequired);
    const slug = d.normalizeTenantSlug(e.storeSlugInput.value) || d.normalizeTenantSlug(s.currentTenant?.slug) || "store";
    r.downloadStoreQrDataUrl(s.currentStoreQrDataUrl, slug);
    r.showSuccess(TEXT.storeQrDownloaded);
  }

  async function ensureAdminTenant({ force = false } = {}) {
    if (!s.currentSession) throw new Error("not_authenticated");
    if (!force && s.currentTenant?.id) return s.currentTenant;
    ctx.setState({ session: { tenant: await d.loadAdminTenantContext({
      session: s.currentSession,
      slugHint: e.storeSlugInput?.value || "",
      force,
    }) } });
    ctx.runtimeGuard.trace("ADMIN_TENANT_LOADED", { tenantId: s.currentTenant?.id || null, force });
    r.updateStoreLink(s.currentTenant?.slug || "");
    return s.currentTenant;
  }

  async function syncAdminSession(session, { forceTenantReload = false, redirectOnMissingSession = true } = {}) {
    const previousUserId = s.currentSession?.user?.id || "";
    ctx.setState({ session: { user: session } });
    if (!session) {
      lastSyncedSessionKey = "";
      r.showLogin({ message: TEXT.sessionMissingRedirect, showLoginAction: true });
      if (redirectOnMissingSession) {
        window.setTimeout(() => {
          if (!s.currentSession) r.redirectToAuth();
        }, 120);
      }
      return;
    }
    const hasConfirmedEmail = v.isConfirmedEmailSession(session);
    if (hasConfirmedEmail) window.sessionStorage.removeItem(ctx.UNVERIFIED_SESSION_KEY);
    r.setAdminPreviewMode(!hasConfirmedEmail || v.isSessionMarkedUnverified());
    try {
      const nextUserId = session.user?.id || "";
      const canReuseCurrentContext = !forceTenantReload && previousUserId === nextUserId && s.currentTenant?.id;
      if (canReuseCurrentContext) {
        r.showDashboard();
        return;
      }
      if (forceTenantReload) {
        d.clearTenantContextCache();
        ctx.setState({ session: { tenant: null } });
      }
      await ensureAdminTenant({ force: forceTenantReload });
      r.showDashboard();
      await loadDashboardData({ silent: false });
    } catch (error) {
      console.error("Error preparing admin tenant context:", error);
      r.showLogin({
        message: TEXT.adminOpenAccountError,
        feedback: TEXT.dashboardLoadError,
        tone: "error",
        showRetryAction: true,
        showLogoutAction: true,
      });
    }
  }

  async function loadDashboardData({ silent = false } = {}) {
    if (dashboardLoadPromise) return dashboardLoadPromise;
    dashboardLoadPromise = (async () => {
      try {
        await ensureAdminTenant();
        const [catsRes, prodsRes, ordersRes, statsRes, settingsRes] = await Promise.all([
          fetchCategoriesFromSupabase(),
          fetchProductsFromSupabase(),
          fetchOrdersFromSupabase(),
          fetchSiteStatsFromSupabase(),
          fetchSiteSettingsFromSupabase(),
        ]);
        if (catsRes.error) throw catsRes.error;
        if (prodsRes.error) throw prodsRes.error;
        if (ordersRes.error) throw ordersRes.error;
        ctx.setState({
          entities: {
            categories: sortCategories(catsRes.data || []),
            products: prodsRes.data || [],
            orders: ordersRes.data || [],
            siteStats: statsRes || { total_visits: 0 },
            siteSettings: settingsRes,
          },
        });
        ctx.runtimeGuard.trace("ADMIN_DASHBOARD_DATA_LOADED", {
          categories: s.categories.length,
          products: s.products.length,
          orders: s.orders.length,
        });
        if (!r.isProductEditorLocked()) r.populateCategories(s.editingProduct?.category || "");
        if (!r.isSettingsLocked()) r.applySiteSettingsToForm();
        r.renderAdminProducts();
        r.renderAdminCategories();
        r.renderAdminOrders();
        r.renderOverviewCards();
        r.renderReadiness();
        if (!r.isProductEditorLocked() && !s.categories.length && s.editingProduct) r.resetProductForm();
        if (!r.isCategoryEditorLocked()) {
          const freshCategory = s.editingCategory
            ? s.categories.find((category) => String(category.id) === String(s.editingCategory.id))
            : null;
          if (!s.editingCategory || !freshCategory) r.resetCategoryForm();
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (!silent) r.showError(TEXT.dashboardLoadError);
      } finally {
        dashboardLoadPromise = null;
      }
    })();
    return dashboardLoadPromise;
  }

  async function checkSession() {
    if (!d.hasSupabaseConfig) {
      r.showLogin({
        message: TEXT.adminRequiresConnection,
        feedback: TEXT.supabaseRequired,
        tone: "error",
      });
      return;
    }
    r.showLogin({ message: TEXT.checkingAccountThenAdmin || TEXT.checkingSession });
    window.setTimeout(() => {
      if (!s.hasReceivedInitialAuthState) {
        r.showLogin({
          message: TEXT.sessionDelayed,
          feedback: TEXT.retryOrReturnToLogin,
          tone: "error",
          showLoginAction: true,
          showRetryAction: true,
        });
      }
    }, 4e3);
  }

  Object.assign(ctx.actions, {
    bindAuthStateListener, checkSession, ensureAdminTenant, handleAuthStateChange,
    retryAdminSession, runAdminAuthSync, startDashboardPolling, stopDashboardPolling,
    syncAdminSession, logoutAdmin, loadDashboardData, renderStoreQr,
    copyStoreLinkToClipboard, downloadStoreQrImage, editCategory, editProduct,
    deleteCategory, deleteProduct, toggleProductAvailability, updateOrderStatus,
    insertCategoryIntoSupabase, normalizeOrderValue, updateCategoryInSupabase,
    uploadImageToStorage,
    validateTenantIdentityConflicts: getTenantIdentityConflicts,
  });
  installAdminFormActions(ctx, {
    insertCategoryIntoSupabase,
    loadDashboardData,
    normalizeOrderValue,
    updateCategoryInSupabase,
    uploadImageToStorage,
    validateTenantIdentityConflicts: getTenantIdentityConflicts,
  });
}
