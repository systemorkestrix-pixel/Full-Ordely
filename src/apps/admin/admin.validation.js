import { createAdminValidationTools } from "../../features/admin/admin.validation.js";

export function installAdminValidation(ctx) {
  const tools = createAdminValidationTools({
    defaultCategoryIcon: ctx.DEFAULT_CATEGORY_ICON,
    defaultSiteSettings: ctx.DEFAULT_SITE_SETTINGS,
    fieldLabels: ctx.ADMIN_FIELD_LABELS_UI,
    normalizeSiteSettings: ctx.dependencies.normalizeSiteSettings,
    text: ctx.TEXT,
    unverifiedSessionKey: ctx.UNVERIFIED_SESSION_KEY,
    validationText: ctx.VALIDATION_TEXT,
  });

  const tenantId = () => ctx.state.currentTenant?.id || null;
  const normalizeAdminSiteSettings = (value) => tools.normalizeAdminSiteSettings(value, tenantId());

  Object.assign(ctx.validation, {
    ...tools,
    normalizeAdminSiteSettings,
  });
}
