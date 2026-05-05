import { createAdminTableRenderers } from "./admin.copy.js";

export function installAdminRender(ctx) {
  const { ADMIN_RENDER_UI_TEXT, DEFAULT_CATEGORY_ICON, TEXT, dependencies, elements: e, state: s } = ctx;
  const { normalizeTenantSlug, normalizeUrl } = dependencies;

  function measureRender(name, task) {
    return ctx.runtimeGuard.measureRender(name, task);
  }
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderButtonContent(label, iconId = "") {
    return `<span class="btn-content">${iconId ? ctx.renderIcon(iconId) : ""}<span>${escapeHtml(label)}</span></span>`;
  }

  function renderTableActionButton({ action, label, icon = "", className = "", id = "", nextStatus = "" }) {
    const actionClassName = ["btn", "btn-small", className].filter(Boolean).join(" ");
    const statusAttribute = nextStatus ? ` data-next-status="${escapeHtml(nextStatus)}"` : "";
    return `<button type="button" class="${actionClassName}" data-action="${escapeHtml(action)}" data-id="${escapeHtml(String(id))}"${statusAttribute}>${renderButtonContent(label, icon)}</button>`;
  }

  function setButtonContent(button, label, iconId = "") {
    button.innerHTML = renderButtonContent(label, iconId);
  }

  function toggleHidden(element, shouldHide) {
    element.classList.toggle("hidden", shouldHide);
  }

  function formatCount(value) {
    return Intl.NumberFormat("ar-DZ").format(Number(value) || 0);
  }

  function formatDateTime(value) {
    const dateValue = value ? new Date(value) : null;
    if (!dateValue || Number.isNaN(dateValue.getTime())) return TEXT.none;
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium", timeStyle: "short" }).format(dateValue);
  }

  function getToastTitle(type) {
    return { success: TEXT.toastSuccess, error: TEXT.toastError, warning: TEXT.toastWarning }[type] || TEXT.toastInfo;
  }
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `admin-toast admin-toast-${type}`;
    toast.innerHTML = `<div class="admin-toast-title">${escapeHtml(getToastTitle(type))}</div><p class="admin-toast-message">${escapeHtml(message)}</p>`;
    e.adminToastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  const showSuccess = (message) => showToast(message, "success");
  const showError = (message) => showToast(message, "error");
  const showWarning = (message) => showToast(message, "warning");

  function syncAuthEntryLink() {
    if (e.btnGoToAuth) e.btnGoToAuth.href = "/auth";
  }
  function redirectToAuth() {
    window.location.replace("/auth");
  }
  function clearAuthGateFeedback() {
    if (!e.authGateFeedback) return;
    e.authGateFeedback.textContent = "";
    e.authGateFeedback.dataset.tone = "info";
    e.authGateFeedback.classList.add("hidden");
  }

  function showAuthGateFeedback(message, tone = "info") {
    if (!e.authGateFeedback) return;
    e.authGateFeedback.textContent = message;
    e.authGateFeedback.dataset.tone = tone;
    e.authGateFeedback.classList.remove("hidden");
  }

  function toggleAuthGateAction(element, isVisible) {
    if (element) element.classList.toggle("hidden", !isVisible);
  }

  function setAuthGateState({ message, feedback = "", tone = "info", showLoginAction = false, showRetryAction = false, showLogoutAction = false } = {}) {
    if (e.authGateMessage && message) e.authGateMessage.textContent = message;
    clearAuthGateFeedback();
    if (feedback) showAuthGateFeedback(feedback, tone);
    toggleAuthGateAction(e.btnGoToAuth, showLoginAction);
    toggleAuthGateAction(e.btnRetryAdmin, showRetryAction);
    toggleAuthGateAction(e.btnAuthLogout, showLogoutAction);
  }

  function updateFileInputName(input, label) {
    const file = input.files?.[0];
    label.textContent = file ? file.name : TEXT.fileNotSelected;
  }

  function closeConfirmModal(result = false) {
    if (!s.confirmResolver) return;
    const resolve = s.confirmResolver;
    ctx.setState({ draft: { confirmResolver: null } });
    e.adminConfirmModal.classList.add("hidden");
    e.adminConfirmModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("admin-confirm-open");
    resolve(result);
  }

  function askConfirmation({ title = TEXT.confirmTitle, message, confirmLabel = TEXT.confirmAction, tone = "danger" } = {}) {
    return new Promise((resolve) => {
      if (s.confirmResolver) closeConfirmModal(false);
      ctx.setState({ draft: { confirmResolver: resolve } });
      e.adminConfirmTitle.textContent = title;
      e.adminConfirmMessage.textContent = message;
      e.btnConfirmCancel.textContent = TEXT.cancel;
      e.btnConfirmAccept.textContent = confirmLabel;
      e.btnConfirmAccept.dataset.tone = tone;
      e.adminConfirmModal.classList.remove("hidden");
      e.adminConfirmModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-confirm-open");
    });
  }

  function markProductFormDirty() {
    if (s.editingProduct || e.productEditorShell.getAttribute("aria-hidden") === "false") ctx.setState({ ui: { productFormDirty: true } });
  }

  function markCategoryFormDirty() {
    if (s.editingCategory || e.categoryEditorShell.getAttribute("aria-hidden") === "false") ctx.setState({ ui: { categoryFormDirty: true } });
  }

  function syncSettingsSaveButton() {
    if (e.btnSaveSettings) e.btnSaveSettings.disabled = !s.isSettingsFormDirty;
  }

  function markSettingsFormDirty() {
    ctx.setState({ ui: { settingsFormDirty: true } });
    syncSettingsSaveButton();
  }

  function isProductEditorLocked() {
    return e.productEditorShell.getAttribute("aria-hidden") === "false" || s.isProductFormDirty;
  }

  function isCategoryEditorLocked() {
    return e.categoryEditorShell.getAttribute("aria-hidden") === "false" || s.isCategoryFormDirty;
  }

  function isSettingsLocked() {
    return s.isSettingsFormDirty;
  }

  function updateHeroPreview(imageUrl) {
    const nextImageUrl = String(imageUrl || "").trim();
    if (!nextImageUrl) {
      e.heroPreviewImage.removeAttribute("src");
      e.heroPreviewImage.hidden = true;
      return;
    }
    e.heroPreviewImage.src = nextImageUrl;
    e.heroPreviewImage.hidden = false;
  }

  function copyTextToClipboardFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.className = "clipboard-helper-field";
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function downloadStoreQrDataUrl(dataUrl, slug) {
    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    downloadLink.download = `ordely-store-${slug}.png`;
    downloadLink.click();
  }

  function buildStorefrontPath(slug) {
    const normalizedSlug = normalizeTenantSlug(slug);
    return normalizedSlug ? `/s/${normalizedSlug}` : "/";
  }

  function buildStorefrontUrl(slug) {
    const nextPath = buildStorefrontPath(slug);
    return nextPath === "/" ? "" : new URL(nextPath, window.location.origin).toString();
  }

  function getStorefrontDisplayUrl(slug) {
    const nextPath = buildStorefrontPath(slug);
    return new URL(nextPath === "/" ? "/s/my-store" : nextPath, window.location.origin).toString();
  }

  function setStoreShareActionsDisabled({ copyDisabled = true, downloadDisabled = true } = {}) {
    if (e.btnCopyStoreLink) e.btnCopyStoreLink.disabled = s.isPreviewMode || copyDisabled;
    if (e.btnDownloadStoreQr) e.btnDownloadStoreQr.disabled = s.isPreviewMode || downloadDisabled;
  }

  function resetStoreQrUi({ displayUrl = getStorefrontDisplayUrl(""), showWarning: shouldShowWarning = true } = {}) {
    ctx.setState({
      ui: {
        currentStorefrontUrl: "",
        currentStoreQrDataUrl: "",
        storeQrRenderToken: s.storeQrRenderToken + 1,
      },
    });
    if (e.storeUrlDisplay) e.storeUrlDisplay.textContent = displayUrl;
    if (e.storeQrWarning) e.storeQrWarning.classList.toggle("hidden", !shouldShowWarning);
    if (e.storeQrPanel) e.storeQrPanel.classList.add("hidden");
    if (e.storeQrImage) {
      e.storeQrImage.removeAttribute("src");
      e.storeQrImage.hidden = true;
    }
    if (e.storeQrLabel) e.storeQrLabel.textContent = TEXT.storeQrLabel;
    setStoreShareActionsDisabled({ copyDisabled: true, downloadDisabled: true });
  }

  function prepareStoreQrRender(url) {
    const normalizedUrl = String(url || "").trim();
    const renderToken = s.storeQrRenderToken + 1;
    ctx.setState({
      ui: {
        currentStorefrontUrl: normalizedUrl,
        currentStoreQrDataUrl: "",
        storeQrRenderToken: renderToken,
      },
    });
    if (e.storeUrlDisplay) e.storeUrlDisplay.textContent = normalizedUrl;
    if (e.storeQrWarning) e.storeQrWarning.classList.add("hidden");
    if (e.storeQrPanel) e.storeQrPanel.classList.add("hidden");
    if (e.storeQrImage) e.storeQrImage.hidden = true;
    setStoreShareActionsDisabled({ copyDisabled: false, downloadDisabled: true });
    return renderToken;
  }

  function completeStoreQrRender(renderToken, normalizedUrl, dataUrl) {
    if (renderToken !== s.storeQrRenderToken || s.currentStorefrontUrl !== normalizedUrl) return;
    ctx.setState({ ui: { currentStoreQrDataUrl: dataUrl } });
    if (e.storeQrImage) {
      e.storeQrImage.src = dataUrl;
      e.storeQrImage.hidden = false;
    }
    if (e.storeQrPanel) e.storeQrPanel.classList.remove("hidden");
    setStoreShareActionsDisabled({ copyDisabled: false, downloadDisabled: !dataUrl });
  }

  function failStoreQrRender(renderToken) {
    if (renderToken !== s.storeQrRenderToken) return;
    ctx.setState({ ui: { currentStoreQrDataUrl: "" } });
    if (e.storeQrPanel) e.storeQrPanel.classList.add("hidden");
    if (e.storeQrImage) {
      e.storeQrImage.removeAttribute("src");
      e.storeQrImage.hidden = true;
    }
    setStoreShareActionsDisabled({ copyDisabled: false, downloadDisabled: true });
    showWarning(TEXT.storeQrGenerateError);
  }

  function updateStoreLink(slug) {
    const nextPath = buildStorefrontPath(slug);
    const displayUrl = getStorefrontDisplayUrl(slug);
    const nextUrl = buildStorefrontUrl(slug);
    if (e.storeSlugPreview) e.storeSlugPreview.textContent = nextPath === "/" ? "/s/my-store" : nextPath;
    if (e.storeUrlDisplay) e.storeUrlDisplay.textContent = displayUrl;
    if (e.btnOpenSite) {
      e.btnOpenSite.href = s.isPreviewMode ? "#" : nextPath;
      e.btnOpenSite.setAttribute("aria-disabled", String(s.isPreviewMode));
    }
    if (s.isPreviewMode) return resetStoreQrUi({ displayUrl, showWarning: false });
    if (!nextUrl) return resetStoreQrUi({ displayUrl, showWarning: true });
    ctx.actions.renderStoreQr(nextUrl);
  }

  function setAdminPreviewMode(isEnabled) {
    ctx.setState({ ui: { previewMode: Boolean(isEnabled) } });
    document.body.classList.toggle("admin-preview-mode", s.isPreviewMode);
    if (e.adminPreviewGate) e.adminPreviewGate.classList.toggle("hidden", !s.isPreviewMode);
    if (e.adminPreviewGateTitle) e.adminPreviewGateTitle.textContent = TEXT.previewGateTitle;
    if (e.adminPreviewGateText) e.adminPreviewGateText.textContent = TEXT.previewGateText;
    if (e.ordersEnabledInput) {
      e.ordersEnabledInput.disabled = s.isPreviewMode;
      if (s.isPreviewMode) e.ordersEnabledInput.checked = false;
    }
    if (e.btnOpenSite) {
      e.btnOpenSite.setAttribute("aria-disabled", String(s.isPreviewMode));
      if (s.isPreviewMode) e.btnOpenSite.href = "#";
    }
    setStoreShareActionsDisabled({
      copyDisabled: s.isPreviewMode || !s.currentStorefrontUrl,
      downloadDisabled: s.isPreviewMode || !s.currentStoreQrDataUrl,
    });
  }

  function applyStaticButtonLabels() {
    syncAuthEntryLink();
    setButtonContent(e.btnSaveProduct, TEXT.createProduct || TEXT.addProduct, "plus");
    setButtonContent(e.btnCancelEdit, TEXT.cancel);
    setButtonContent(e.btnSaveCategory, TEXT.createCategory || TEXT.addCategory, "plus");
    setButtonContent(e.btnCancelCategoryEdit, TEXT.cancel);
    setButtonContent(e.btnSaveSettings, TEXT.saveSettings, "save");
  }

  function updateProductFormState() {
    const hasCategories = s.categories.length > 0;
    e.prodCategory.disabled = !hasCategories;
    e.btnSaveProduct.disabled = !hasCategories;
    e.productCategoryHint.classList.toggle("form-help-danger", !hasCategories);
    e.productCategoryHint.textContent = hasCategories ? TEXT.chooseCategory : TEXT.addCategoryFirst;
  }

  function getNextCategoryOrder() {
    if (!s.categories.length) return 1;
    return Math.max(...s.categories.map((category) => Number(category.order_index) || 0)) + 1;
  }

  function syncProductEditorHeading() {
    e.productEditorTitle.textContent = s.editingProduct ? TEXT.editProductTitle : TEXT.addProductTitle;
    e.productEditorSubtitle.textContent = s.editingProduct ? TEXT.editProductSubtitle : TEXT.addProductSubtitle;
  }

  function syncCategoryEditorHeading() {
    e.categoryEditorTitle.textContent = s.editingCategory ? TEXT.editCategoryTitle : TEXT.addCategoryTitle;
    e.categoryEditorSubtitle.textContent = s.editingCategory ? TEXT.editCategorySubtitle : TEXT.addCategorySubtitle;
  }

  function openProductEditor() {
    closeCategoryEditor({ reset: false });
    syncProductEditorHeading();
    e.productEditorShell.classList.remove("hidden");
    e.productEditorShell.setAttribute("aria-hidden", "false");
    document.body.classList.add("product-editor-open");
    e.productEditorSurface.scrollTop = 0;
    window.requestAnimationFrame(() => e.prodName.focus());
  }

  function closeProductEditor({ reset = true } = {}) {
    if (reset) resetProductForm();
    ctx.setState({ ui: { productFormDirty: false } });
    e.productEditorShell.classList.add("hidden");
    e.productEditorShell.setAttribute("aria-hidden", "true");
    document.body.classList.remove("product-editor-open");
  }

  function openCategoryEditor() {
    closeProductEditor({ reset: false });
    syncCategoryEditorHeading();
    e.categoryEditorShell.classList.remove("hidden");
    e.categoryEditorShell.setAttribute("aria-hidden", "false");
    document.body.classList.add("category-editor-open");
    e.categoryEditorSurface.scrollTop = 0;
    window.requestAnimationFrame(() => e.catNameInput.focus());
  }

  function closeCategoryEditor({ reset = true } = {}) {
    if (reset) resetCategoryForm();
    ctx.setState({ ui: { categoryFormDirty: false } });
    e.categoryEditorShell.classList.add("hidden");
    e.categoryEditorShell.setAttribute("aria-hidden", "true");
    document.body.classList.remove("category-editor-open");
  }

  function populateCategories(selectedCategory = "") {
    const currentSelection = selectedCategory || e.prodCategory.value;
    e.prodCategory.innerHTML = "";
    if (!s.categories.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = TEXT.noCategoriesAvailable;
      option.selected = true;
      e.prodCategory.appendChild(option);
      updateProductFormState();
      return;
    }
    s.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.name;
      e.prodCategory.appendChild(option);
    });
    const categoryExists = s.categories.some((category) => category.name === currentSelection);
    e.prodCategory.value = categoryExists ? currentSelection : s.categories[0].name;
    updateProductFormState();
  }

  function getCategoryUsageCount(categoryName) {
    return s.products.filter((product) => product.category === categoryName).length;
  }

  function getOrderStatusTone(status) { return { processing: "processing", completed: "completed", cancelled: "cancelled" }[status] || "new"; }
  function getOrderProductImage(order) {
    return String(order?.product_image_url || order?.image_url || "").trim() || String((s.products.find((product) => String(product.id) === String(order?.target_product_id || order?.product_id || order?.productId))
      || s.products.find((product) => product.name === order?.product_name && product.category === order?.product_category)
      || s.products.find((product) => product.name === order?.product_name))?.image_url || "").trim();
  }

  const tableRender = createAdminTableRenderers({
    ADMIN_RENDER_UI_TEXT,
    DEFAULT_CATEGORY_ICON,
    TEXT,
    escapeHtml,
    getCategoryUsageCount,
    getOrderProductImage,
    getOrderStatusTone,
    renderTableActionButton,
  });

  function updateOrdersBadge() {
    const newOrdersCount = s.orders.filter((order) => order.status === "new").length;
    e.btnOrdersInbox.classList.toggle("hidden", !s.currentSession);
    e.newOrdersBadge.textContent = formatCount(newOrdersCount);
    e.newOrdersBadge.classList.toggle("hidden", newOrdersCount === 0);
  }

  function renderOverviewCards() {
    return measureRender("admin.overview", () => {
      const newOrdersCount = s.orders.filter((order) => order.status === "new").length;
      e.summaryNewOrders.textContent = formatCount(newOrdersCount);
      e.summaryTotalOrders.textContent = formatCount(s.orders.length);
      e.summarySiteVisits.textContent = formatCount(s.siteStats.total_visits);
      updateOrdersBadge();
    });
  }

  function renderReadiness() {
    if (!e.readinessFill || !e.readinessSteps || !e.readinessScore) return;
    const steps = [
      { label: "رابط المتجر", done: Boolean(s.currentTenant?.slug) },
      { label: "التصنيفات", done: s.categories.length > 0 },
      { label: "المنتجات", done: s.products.length > 0 },
      { label: "قناة التواصل", done: Boolean(s.siteSettings.whatsapp_url || s.siteSettings.phone_number) },
      { label: "صورة الغلاف", done: Boolean(s.siteSettings.hero_image_url) },
    ];
    const doneCount = steps.filter((step) => step.done).length;
    const total = steps.length;
    const pct = Math.round((doneCount / total) * 100);
    const isComplete = doneCount === total;

    e.readinessFill.style.width = `${pct}%`;
    e.readinessFill.dataset.complete = isComplete ? "true" : "false";
    e.readinessScore.textContent = `${doneCount}/${total}`;

    e.readinessSteps.innerHTML = steps.map((step) => `
      <div class="settings-readiness-step ${step.done ? "is-done" : "is-pending"}">
        <span class="settings-readiness-step-icon">${step.done ? "✓" : "○"}</span>
        <span>${escapeHtml(step.label)}</span>
      </div>
    `).join("");
  }

  function renderAdminProducts() {
    return measureRender("admin.products", () => {
      if (!s.products.length) {
        e.productsTableBody.innerHTML = tableRender.renderEmptyTableRow(TEXT.noProductsYet);
        return;
      }
      e.productsTableBody.innerHTML = s.products.map((product) => tableRender.renderProductRow(product)).join("");
    });
  }

  function renderAdminCategories() {
    return measureRender("admin.categories", () => {
      e.categoriesTableBody.innerHTML = tableRender.renderCategoryCollection(s.categories, TEXT.noCategoriesYet);
    });
  }

  function renderAdminOrders() {
    return measureRender("admin.orders", () => {
      if (!s.orders.length) {
        e.ordersTableBody.innerHTML = tableRender.renderEmptyTableRow(TEXT.noOrdersYet);
        return;
      }
      e.ordersTableBody.innerHTML = s.orders.map((order) => tableRender.renderOrderRow({
        ...order,
        created_at: formatDateTime(order.created_at),
      })).join("");
    });
  }

  function resetProductForm() {
    e.productForm.reset();
    ctx.setState({ ui: { productFormDirty: false }, draft: { editingProduct: null } });
    e.prodIdInput.value = "";
    updateFileInputName(e.prodImage, e.prodImageName);
    e.currentImgUrl.textContent = TEXT.none;
    e.btnSaveProduct.disabled = false;
    setButtonContent(e.btnSaveProduct, TEXT.createProduct || TEXT.addProduct, "plus");
    toggleHidden(e.btnCancelEdit, true);
    populateCategories();
    syncProductEditorHeading();
  }

  function resetCategoryForm() {
    e.categoryForm.reset();
    ctx.setState({ ui: { categoryFormDirty: false }, draft: { editingCategory: null } });
    e.catIdInput.value = "";
    e.catIconInput.value = "";
    e.catOrderInput.value = String(getNextCategoryOrder());
    e.btnSaveCategory.disabled = false;
    setButtonContent(e.btnSaveCategory, TEXT.createCategory || TEXT.addCategory, "plus");
    toggleHidden(e.btnCancelCategoryEdit, true);
    syncCategoryEditorHeading();
  }

  function switchTab(targetId) {
    closeProductEditor();
    closeCategoryEditor();
    e.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.target === targetId));
    ["productsTab", "categoriesTab", "ordersTab", "settingsTab"].forEach((tabId) => {
      document.getElementById(tabId).classList.toggle("hidden", tabId !== targetId);
    });
  }

  function applySiteSettingsToForm() {
    e.heroImageUrlInput.value = s.siteSettings.hero_image_url || "";
    e.heroImageFileInput.value = "";
    updateFileInputName(e.heroImageFileInput, e.heroImageFileName);
    e.storeSlugInput.value = s.currentTenant?.slug || "";
    e.sitePhoneNumberInput.value = s.siteSettings.phone_number || "";
    e.googleMapsUrlInput.value = s.siteSettings.google_maps_url || "";
    e.whatsappUrlInput.value = s.siteSettings.whatsapp_url || "";
    e.messengerUrlInput.value = s.siteSettings.messenger_url || "";
    e.telegramUrlInput.value = s.siteSettings.telegram_url || "";
    e.facebookUrlInput.value = s.siteSettings.facebook_url || "";
    e.instagramUrlInput.value = s.siteSettings.instagram_url || "";
    e.tiktokUrlInput.value = s.siteSettings.tiktok_url || "";
    e.ordersEnabledInput.checked = s.isPreviewMode ? false : Boolean(s.siteSettings.orders_enabled);
    e.ordersEnabledInput.disabled = s.isPreviewMode;
    e.serviceCountryInput.value = s.siteSettings.service_country || "";
    e.serviceRegionInput.value = s.siteSettings.service_region || "";
    updateHeroPreview(s.siteSettings.hero_image_url);
    updateStoreLink(s.currentTenant?.slug || "");
    ctx.setState({ ui: { settingsFormDirty: false } });
    syncSettingsSaveButton();
  }

  function initializeAdminUi() {
    if (s.isAdminUiInitialized) return;
    applyStaticButtonLabels();
    resetCategoryForm();
    updateProductFormState();
    applySiteSettingsToForm();
    switchTab("settingsTab");
    ctx.setState({ ui: { initialized: true } });
  }

  function showDashboard() {
    initializeAdminUi();
    e.authSection.classList.add("hidden");
    e.dashboardSection.classList.remove("hidden");
    e.btnLogout.classList.remove("hidden");
    e.btnOrdersInbox.classList.remove("hidden");
    setAdminPreviewMode(s.isPreviewMode);
    updateStoreLink(s.currentTenant?.slug || "");
    setAuthGateState({ message: TEXT.openingAdmin });
    ctx.actions.startDashboardPolling();
  }

  function showLogin({ message = TEXT.checkingSession, feedback = "", tone = "info", showLoginAction = false, showRetryAction = false, showLogoutAction = false } = {}) {
    ctx.actions.stopDashboardPolling();
    closeProductEditor();
    closeCategoryEditor();
    e.authSection.classList.remove("hidden");
    e.dashboardSection.classList.add("hidden");
    e.btnLogout.classList.add("hidden");
    e.btnOrdersInbox.classList.add("hidden");
    e.newOrdersBadge.classList.add("hidden");
    ctx.setState({ session: { tenant: null } });
    setAdminPreviewMode(false);
    updateStoreLink("");
    ctx.setState({ ui: { settingsFormDirty: false } });
    setAuthGateState({ message, feedback, tone, showLoginAction, showRetryAction, showLogoutAction });
  }

  Object.assign(ctx.render, {
    askConfirmation, buildStorefrontPath, buildStorefrontUrl, closeConfirmModal,
    copyTextToClipboardFallback, downloadStoreQrDataUrl,
    escapeHtml, formatCount, formatDateTime, isCategoryEditorLocked, isProductEditorLocked,
    isSettingsLocked, markCategoryFormDirty, markProductFormDirty, markSettingsFormDirty,
    applySiteSettingsToForm, closeCategoryEditor, closeProductEditor, getCategoryUsageCount,
    completeStoreQrRender, failStoreQrRender, initializeAdminUi, openCategoryEditor, openProductEditor, populateCategories,
    prepareStoreQrRender, resetStoreQrUi,
    redirectToAuth, renderAdminCategories, renderAdminOrders, renderAdminProducts,
    renderButtonContent, renderOverviewCards, renderReadiness, renderTableActionButton, resetCategoryForm,
    resetProductForm, setAdminPreviewMode, setAuthGateState, setButtonContent,
    showDashboard, showError, showLogin, showSuccess, showWarning, switchTab,
    syncAuthEntryLink, syncSettingsSaveButton, toggleHidden, updateFileInputName,
    updateHeroPreview, updateStoreLink,
  });
}
