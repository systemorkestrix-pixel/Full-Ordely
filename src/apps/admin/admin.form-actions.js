export function installAdminFormActions(ctx, helpers) {
  const { TEXT, VALIDATION_TEXT, dependencies: d, elements: e, state: s, validation: v, render: r } = ctx;
  const {
    insertCategoryIntoSupabase,
    loadDashboardData,
    normalizeOrderValue,
    updateCategoryInSupabase,
    uploadImageToStorage,
    validateTenantIdentityConflicts,
  } = helpers;

  function showSaveError(error, fallback) {
    const errorMessage = v.getSaveErrorMessage(error, fallback);
    if (errorMessage === fallback) r.showError(errorMessage);
    else r.showWarning(errorMessage);
  }

  async function saveProductFromForm(event) {
    event.preventDefault();
    if (!s.categories.length) return r.showWarning(TEXT.addCategoryFirst);
    const productName = e.prodName.value.trim();
    const productCategory = String(e.prodCategory.value || "").trim();
    const duplicateProduct = s.products.find((product) =>
      v.normalizeNameKey(product.name) === v.normalizeNameKey(productName) &&
      (!s.editingProduct || String(product.id) !== String(s.editingProduct.id)));
    if (!productName) return r.showWarning(VALIDATION_TEXT.productNameRequired);
    if (!v.isValidName(productName, { min: 2, max: 120 })) return r.showWarning(VALIDATION_TEXT.productNameInvalid);
    if (duplicateProduct) return r.showWarning(VALIDATION_TEXT.duplicateProduct);
    if (!v.isValidPrice(e.prodPrice.value)) return r.showWarning(VALIDATION_TEXT.productPriceInvalid);
    if (!productCategory) return r.showWarning(VALIDATION_TEXT.productCategoryRequired);
    const isEditing = Boolean(s.editingProduct);
    e.btnSaveProduct.disabled = true;
    r.setButtonContent(e.btnSaveProduct, TEXT.loadingSave, "save");
    try {
      const file = e.prodImage.files?.[0];
      const imageUrl = file ? await uploadImageToStorage(file, "products") : s.editingProduct?.image_url || "";
      const payload = {
        tenant_id: s.currentTenant.id,
        name: productName,
        price: Number.parseFloat(e.prodPrice.value),
        category: productCategory,
        is_available: s.editingProduct?.is_available ?? true,
        image_url: imageUrl,
      };
      const result = s.editingProduct
        ? await d.updateProduct({ productId: s.editingProduct.id, tenantId: s.currentTenant.id, payload })
        : await d.createProduct(payload);
      if (result.error) throw result.error;
      ctx.runtimeGuard.trace(s.editingProduct ? "ADMIN_PRODUCT_UPDATED" : "ADMIN_PRODUCT_CREATED", {
        productId: s.editingProduct?.id || result.data?.id || null,
        name: productName,
      });
      r.resetProductForm();
      r.closeProductEditor({ reset: false });
      await loadDashboardData({ silent: true });
      r.showSuccess(TEXT.productSaved);
    } catch (error) {
      console.error("Error saving product:", error);
      showSaveError(error, TEXT.saveProductError);
      e.btnSaveProduct.disabled = false;
      r.setButtonContent(e.btnSaveProduct, isEditing ? TEXT.saveChanges : TEXT.addProduct, isEditing ? "save" : "plus");
    }
  }

  async function saveCategoryFromForm(event) {
    event.preventDefault();
    const categoryName = e.catNameInput.value.trim();
    const categoryIcon = v.normalizeCategoryIcon(e.catIconInput.value);
    const orderIndex = normalizeOrderValue(e.catOrderInput.value);
    if (!categoryName) return r.showWarning(TEXT.categoryNameRequired);
    if (!v.isValidName(categoryName, { min: 2, max: 80 })) return r.showWarning(VALIDATION_TEXT.categoryNameInvalid);
    if (!categoryIcon) return r.showWarning(VALIDATION_TEXT.categoryIconRequired);
    if (v.hasMultipleCategoryIcons(e.catIconInput.value)) return r.showWarning(VALIDATION_TEXT.categoryIconInvalid);
    const duplicateCategory = s.categories.find((category) =>
      String(category.name).trim().toLowerCase() === categoryName.toLowerCase() &&
      (!s.editingCategory || String(category.id) !== String(s.editingCategory.id)));
    if (duplicateCategory) return r.showWarning(TEXT.duplicateCategory);
    await persistCategory({ categoryName, categoryIcon, orderIndex });
  }

  async function persistCategory({ categoryName, categoryIcon, orderIndex }) {
    const isEditing = Boolean(s.editingCategory);
    const oldCategoryName = s.editingCategory?.name || "";
    e.btnSaveCategory.disabled = true;
    r.setButtonContent(e.btnSaveCategory, TEXT.loadingSave, "save");
    try {
      if (s.editingCategory) {
        const { error } = await updateCategoryInSupabase(s.editingCategory.id, categoryName, orderIndex, categoryIcon);
        if (error) throw error;
        if (oldCategoryName && oldCategoryName !== categoryName) {
          const result = await d.updateProductsCategory({ tenantId: s.currentTenant.id, oldCategoryName, nextCategoryName: categoryName });
          if (result.error) throw result.error;
        }
      } else {
        const { error } = await insertCategoryIntoSupabase(categoryName, orderIndex, categoryIcon);
        if (error) throw error;
      }
      ctx.runtimeGuard.trace(s.editingCategory ? "ADMIN_CATEGORY_UPDATED" : "ADMIN_CATEGORY_CREATED", {
        categoryId: s.editingCategory?.id || null,
        name: categoryName,
      });
      if (s.editingProduct && s.editingProduct.category === oldCategoryName) {
        ctx.setState({ draft: { editingProduct: { ...s.editingProduct, category: categoryName } } });
      }
      r.resetCategoryForm();
      r.closeCategoryEditor({ reset: false });
      await loadDashboardData({ silent: true });
      r.populateCategories(s.editingProduct?.category || "");
      r.showSuccess(TEXT.categorySaved);
    } catch (error) {
      console.error("Error saving category:", error);
      showSaveError(error, TEXT.saveCategoryError);
      e.btnSaveCategory.disabled = false;
      r.setButtonContent(e.btnSaveCategory, isEditing ? TEXT.saveCategory : TEXT.addCategory, isEditing ? "save" : "plus");
    }
  }

  async function saveSettingsFromForm(event) {
    event.preventDefault();
    const saveButtonLabel = TEXT.saveSettings;
    e.btnSaveSettings.disabled = true;
    r.setButtonContent(e.btnSaveSettings, TEXT.loadingSave, "save");
    try {
      const uploadedHeroFile = e.heroImageFileInput.files?.[0];
      const rawHeroImageUrl = e.heroImageUrlInput.value.trim();
      const nextSlug = d.normalizeTenantSlug(e.storeSlugInput.value) || s.currentTenant?.slug || d.normalizeTenantSlug(s.currentSession?.user?.email?.split("@")[0] || "my-store");
      let heroImageUrl = d.normalizeUrl(rawHeroImageUrl) || s.siteSettings.hero_image_url || "";
      const nextSettings = d.normalizeSiteSettings({
        hero_image_url: rawHeroImageUrl,
        phone_number: e.sitePhoneNumberInput.value,
        google_maps_url: e.googleMapsUrlInput.value,
        whatsapp_url: e.whatsappUrlInput.value,
        messenger_url: e.messengerUrlInput.value,
        telegram_url: e.telegramUrlInput.value,
        facebook_url: e.facebookUrlInput.value,
        instagram_url: e.instagramUrlInput.value,
        tiktok_url: e.tiktokUrlInput.value,
        orders_enabled: s.isPreviewMode ? false : e.ordersEnabledInput.checked,
        service_country: e.serviceCountryInput.value,
        service_region: e.serviceRegionInput.value,
      });
      const validationMessage = v.validateSettingsPayload({ rawHeroImageUrl, hasUploadedHeroFile: Boolean(uploadedHeroFile), nextSlug, nextSettings });
      if (validationMessage) return r.showWarning(validationMessage);
      const conflictMessage = v.getSettingsConflictMessage(await validateTenantIdentityConflicts(nextSlug, nextSettings));
      if (conflictMessage) return r.showWarning(conflictMessage);
      if (uploadedHeroFile) heroImageUrl = await uploadImageToStorage(uploadedHeroFile, "settings");
      await persistSettings({ nextSlug, nextSettings, heroImageUrl });
    } catch (error) {
      console.error("Error saving site settings:", error);
      showSaveError(error, TEXT.saveSettingsError);
    } finally {
      r.setButtonContent(e.btnSaveSettings, saveButtonLabel, "save");
      r.syncSettingsSaveButton();
    }
  }

  async function persistSettings({ nextSlug, nextSettings, heroImageUrl }) {
    const persistedSettings = {
      id: s.siteSettings.id || crypto.randomUUID(),
      tenant_id: s.currentTenant.id,
      ...nextSettings,
      hero_image_url: heroImageUrl,
    };
    const { data: tenantRecord, error: tenantError } = await d.updateTenantSlug({
      tenantId: s.currentTenant.id,
      ownerUserId: s.currentSession.user.id,
      slug: nextSlug,
    });
    if (tenantError) throw tenantError;
    ctx.setState({ session: { tenant: tenantRecord || { ...s.currentTenant, slug: nextSlug } } });
    d.clearTenantContextCache();
    r.updateStoreLink(nextSlug);
    const { data: savedSettings, error } = await d.updateSettings(persistedSettings);
    if (error) {
      if (v.isMissingSiteSettingsError(error)) throw new Error(TEXT.saveSettingsError);
      throw error;
    }
    ctx.setState({
      entities: { siteSettings: v.normalizeAdminSiteSettings(savedSettings || persistedSettings, s.currentTenant.id) },
      ui: { settingsFormDirty: false },
    });
    ctx.runtimeGuard.trace("ADMIN_SETTINGS_UPDATED", { tenantId: s.currentTenant.id, slug: nextSlug });
    r.applySiteSettingsToForm();
    r.showSuccess(TEXT.settingsSaved);
  }

  function normalizeCategoryIconInput() {
    const normalizedIcon = v.takeFirstGrapheme(e.catIconInput.value);
    if (normalizedIcon !== e.catIconInput.value.trim()) e.catIconInput.value = normalizedIcon;
  }

  function updateStoreSlugPreview() {
    r.updateStoreLink(e.storeSlugInput.value);
  }

  function normalizeStoreSlugInput() {
    e.storeSlugInput.value = d.normalizeTenantSlug(e.storeSlugInput.value);
    r.updateStoreLink(e.storeSlugInput.value);
  }

  function updateHeroUrlPreview() {
    if (e.heroImageFileInput.files.length === 0) r.updateHeroPreview(d.normalizeUrl(e.heroImageUrlInput.value));
  }

  function updateHeroFilePreview() {
    r.updateFileInputName(e.heroImageFileInput, e.heroImageFileName);
    const file = e.heroImageFileInput.files?.[0];
    r.updateHeroPreview(file ? URL.createObjectURL(file) : d.normalizeUrl(e.heroImageUrlInput.value));
  }

  function updateProductImageFileLabel() {
    r.updateFileInputName(e.prodImage, e.prodImageName);
  }

  Object.assign(ctx.actions, {
    normalizeCategoryIconInput,
    normalizeStoreSlugInput,
    saveCategoryFromForm,
    saveProductFromForm,
    saveSettingsFromForm,
    updateHeroFilePreview,
    updateHeroUrlPreview,
    updateProductImageFileLabel,
    updateStoreSlugPreview,
  });
}
