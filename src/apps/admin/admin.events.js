export function bindAdminEvents(ctx) {
  const { TEXT, elements: e, state: s, render: r, actions: a } = ctx;

  const dispatch = (task, label) => {
    ctx.runtimeGuard.trackEvent(label);
    task().catch((error) => console.error(`${label}:`, error));
  };

  e.btnLogout.addEventListener("click", () => dispatch(a.logoutAdmin, "Admin logout error"));
  e.btnRetryAdmin?.addEventListener("click", a.retryAdminSession);
  e.btnAuthLogout?.addEventListener("click", () => dispatch(a.logoutAdmin, "Admin auth logout error"));
  e.btnOrdersInbox.addEventListener("click", () => r.switchTab("ordersTab"));
  e.btnOpenSite?.addEventListener("click", (event) => {
    if (!s.isPreviewMode) return;
    event.preventDefault();
    r.showWarning(TEXT.previewGateBlocked);
  });

  bindEditorEvents();
  bindFormEvents();
  bindTableEvents();
  a.bindAuthStateListener();

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!e.adminConfirmModal.classList.contains("hidden")) {
      r.closeConfirmModal(false);
      return;
    }
    if (!e.productEditorShell.classList.contains("hidden")) r.closeProductEditor();
    if (!e.categoryEditorShell.classList.contains("hidden")) r.closeCategoryEditor();
  });

  function bindEditorEvents() {
    e.btnOpenProductEditor.addEventListener("click", () => {
      r.resetProductForm();
      r.openProductEditor();
    });
    e.btnCloseProductEditor.addEventListener("click", () => r.closeProductEditor());
    e.productEditorShell.addEventListener("click", (event) => {
      if (event.target.dataset.closeProductEditor === "true") r.closeProductEditor();
    });
    e.btnOpenCategoryEditor.addEventListener("click", () => {
      r.resetCategoryForm();
      r.openCategoryEditor();
    });
    e.btnCloseCategoryEditor.addEventListener("click", () => r.closeCategoryEditor());
    e.categoryEditorShell.addEventListener("click", (event) => {
      if (event.target.dataset.closeCategoryEditor === "true") r.closeCategoryEditor();
    });
    e.adminConfirmModal.addEventListener("click", (event) => {
      if (event.target.dataset.confirmClose === "true") r.closeConfirmModal(false);
    });
    e.btnConfirmCancel.addEventListener("click", () => r.closeConfirmModal(false));
    e.btnConfirmAccept.addEventListener("click", () => r.closeConfirmModal(true));
    e.btnCancelEdit.addEventListener("click", () => r.closeProductEditor());
    e.btnCancelCategoryEdit.addEventListener("click", () => r.closeCategoryEditor());
  }

  function bindFormEvents() {
    [e.prodName, e.prodPrice, e.prodCategory, e.prodImage].forEach((field) => {
      field.addEventListener("input", r.markProductFormDirty);
      field.addEventListener("change", r.markProductFormDirty);
    });
    [e.catNameInput, e.catIconInput, e.catOrderInput].forEach((field) => {
      field.addEventListener("input", r.markCategoryFormDirty);
      field.addEventListener("change", r.markCategoryFormDirty);
    });
    [
      e.heroImageUrlInput, e.heroImageFileInput, e.storeSlugInput, e.sitePhoneNumberInput,
      e.googleMapsUrlInput, e.whatsappUrlInput, e.messengerUrlInput, e.telegramUrlInput,
      e.facebookUrlInput, e.instagramUrlInput, e.tiktokUrlInput, e.ordersEnabledInput,
      e.serviceCountryInput, e.serviceRegionInput,
    ].forEach((field) => {
      field.addEventListener("input", r.markSettingsFormDirty);
      field.addEventListener("change", r.markSettingsFormDirty);
    });
    e.catIconInput.addEventListener("input", a.normalizeCategoryIconInput);
    e.storeSlugInput.addEventListener("input", a.updateStoreSlugPreview);
    e.storeSlugInput.addEventListener("change", a.normalizeStoreSlugInput);
    e.btnCopyStoreLink?.addEventListener("click", () => dispatch(a.copyStoreLinkToClipboard, "Copy store link error"));
    e.btnDownloadStoreQr?.addEventListener("click", a.downloadStoreQrImage);
    e.heroImageUrlInput.addEventListener("input", a.updateHeroUrlPreview);
    e.heroImageFileInput.addEventListener("change", a.updateHeroFilePreview);
    e.prodImage.addEventListener("change", a.updateProductImageFileLabel);
    e.productForm.addEventListener("submit", (event) => dispatch(() => a.saveProductFromForm(event), "Save product error"));
    e.categoryForm.addEventListener("submit", (event) => dispatch(() => a.saveCategoryFromForm(event), "Save category error"));
    e.settingsForm.addEventListener("submit", (event) => dispatch(() => a.saveSettingsFromForm(event), "Save settings error"));
  }

  function bindTableEvents() {
    const tableActionHandlers = {
      "toggle-product-availability": (id) => dispatch(() => a.toggleProductAvailability(id), "Toggle product availability error"),
      "edit-product": (id) => a.editProduct(id),
      "delete-product": (id) => dispatch(() => a.deleteProduct(id), "Delete product error"),
      "edit-category": (id) => a.editCategory(id),
      "delete-category": (id) => dispatch(() => a.deleteCategory(id), "Delete category error"),
      "update-order-status": (id, nextStatus) => dispatch(() => a.updateOrderStatus(id, nextStatus), "Update order status error"),
    };

    e.tabs.forEach((tab) => tab.addEventListener("click", () => r.switchTab(tab.dataset.target)));
    e.productsTableBody.addEventListener("click", (event) => dispatchTableAction(event, {
      "toggle-product-availability": tableActionHandlers["toggle-product-availability"],
      "edit-product": tableActionHandlers["edit-product"],
      "delete-product": tableActionHandlers["delete-product"],
    }));
    e.categoriesTableBody.addEventListener("click", (event) => dispatchTableAction(event, {
      "edit-category": tableActionHandlers["edit-category"],
      "delete-category": tableActionHandlers["delete-category"],
    }));
    e.ordersTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (button?.dataset.action === "update-order-status" && button.dataset.id && button.dataset.nextStatus) {
        tableActionHandlers["update-order-status"](button.dataset.id, button.dataset.nextStatus);
      }
    });
  }

  function dispatchTableAction(event, handlers) {
    const button = event.target.closest("button[data-action]");
    const handler = button && handlers[button.dataset.action];
    if (handler && button.dataset.id) handler(button.dataset.id);
  }
}
