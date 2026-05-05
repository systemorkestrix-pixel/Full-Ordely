export function createAdminValidationTools({
  text,
  validationText,
  fieldLabels,
  defaultCategoryIcon,
  defaultSiteSettings,
  normalizeSiteSettings,
  unverifiedSessionKey,
}) {
  const graphemeSegmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(void 0, { granularity: "grapheme" })
      : null;

  function normalizeAdminSiteSettings(value, tenantId) {
    const normalizedSettings = normalizeSiteSettings({
      ...defaultSiteSettings,
      ...value,
    });
    return {
      ...normalizedSettings,
      id: String(value?.id || ""),
      tenant_id: value?.tenant_id || tenantId || null,
    };
  }

  function normalizeNameKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getGraphemeCount(value) {
    const trimmedValue = String(value || "").trim();
    if (!trimmedValue) return 0;
    return graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(trimmedValue)).length
      : Array.from(trimmedValue).length;
  }

  function takeFirstGrapheme(value) {
    const trimmedValue = String(value || "").trim();
    if (!trimmedValue) return "";
    return graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(trimmedValue))[0]?.segment || ""
      : Array.from(trimmedValue)[0] || "";
  }

  function isValidName(value, { min = 2, max = 120 } = {}) {
    const trimmedValue = String(value || "").trim();
    return trimmedValue.length >= min && trimmedValue.length <= max;
  }

  function isValidPrice(value) {
    const numericValue = Number.parseFloat(value);
    return Number.isFinite(numericValue) && numericValue > 0;
  }

  function isValidPhoneLikeValue(value) {
    return !value || /^\+?\d{8,16}$/.test(value);
  }

  function isValidMessengerHandle(value) {
    return !value || /^[A-Za-z0-9._-]{3,80}$/.test(value);
  }

  function isValidTelegramHandle(value) {
    return !value || /^@[A-Za-z0-9_]{5,32}$/.test(value);
  }

  function parseAbsoluteUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function isValidUrl(value, allowedHostMatcher = null) {
    if (!value) return true;
    const parsedUrl = parseAbsoluteUrl(value);
    if (!parsedUrl || !["http:", "https:"].includes(parsedUrl.protocol)) return false;
    return typeof allowedHostMatcher === "function"
      ? allowedHostMatcher(parsedUrl.hostname.toLowerCase(), parsedUrl)
      : true;
  }

  function matchesHost(hostname, allowedHosts) {
    return allowedHosts.some((allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`));
  }

  function isGoogleMapsHost(hostname) {
    return hostname === "maps.app.goo.gl" || hostname === "goo.gl" || hostname.includes("google.");
  }

  function isUniqueViolation(error, constraintName) {
    const message = getSupabaseErrorMessage(error);
    return error?.code === "23505" && message.includes(constraintName);
  }

  function getSupabaseErrorMessage(error) {
    if (!error) return text.unknownSupabaseError;
    return error.message || error.details || error.hint || text.unknownSupabaseError;
  }

  function getSettingsConflictMessage(conflicts = {}) {
    const labels = {
      phone_number: fieldLabels.phone,
      whatsapp_url: fieldLabels.whatsapp,
      messenger_url: fieldLabels.messenger,
      telegram_url: fieldLabels.telegram,
      google_maps_url: fieldLabels.googleMaps,
      facebook_url: fieldLabels.facebook,
      instagram_url: fieldLabels.instagram,
      tiktok_url: fieldLabels.tiktok,
    };
    if (conflicts.slug) return validationText.duplicateStoreSlug;
    const key = Object.keys(labels).find((field) => conflicts[field]);
    return key ? validationText.contactUsed(labels[key]) : "";
  }

  function getSaveErrorMessage(error, fallbackMessage) {
    const uniqueMessages = [
      ["products_tenant_name_unique_idx", validationText.duplicateProduct],
      ["categories_tenant_name_unique_idx", text.duplicateCategory],
      ["tenants_slug_unique_idx", validationText.duplicateStoreSlug],
      ["site_settings_phone_number_unique_idx", validationText.contactUsed(fieldLabels.phone)],
      ["site_settings_google_maps_url_unique_idx", validationText.contactUsed(fieldLabels.googleMaps)],
      ["site_settings_whatsapp_url_unique_idx", validationText.contactUsed(fieldLabels.whatsapp)],
      ["site_settings_messenger_url_unique_idx", validationText.contactUsed(fieldLabels.messenger)],
      ["site_settings_telegram_url_unique_idx", validationText.contactUsed(fieldLabels.telegram)],
      ["site_settings_facebook_url_unique_idx", validationText.contactUsed(fieldLabels.facebook)],
      ["site_settings_instagram_url_unique_idx", validationText.contactUsed(fieldLabels.instagram)],
      ["site_settings_tiktok_url_unique_idx", validationText.contactUsed(fieldLabels.tiktok)],
    ];
    return uniqueMessages.find(([constraint]) => isUniqueViolation(error, constraint))?.[1] || fallbackMessage;
  }

  function isMissingColumnError(error, columnName) {
    const message = getSupabaseErrorMessage(error).toLowerCase();
    return message.includes(columnName.toLowerCase()) && message.includes("column");
  }

  function isMissingSiteSettingsError(error) {
    const message = getSupabaseErrorMessage(error).toLowerCase();
    return message.includes("site_settings") &&
      (message.includes("schema cache") || message.includes("does not exist") || message.includes("relation"));
  }

  function validateSettingsPayload({ rawHeroImageUrl, hasUploadedHeroFile, nextSlug, nextSettings }) {
    if (!nextSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) return validationText.invalidStoreSlug;
    if (rawHeroImageUrl && !hasUploadedHeroFile && !nextSettings.hero_image_url) return validationText.invalidHeroImageUrl;
    if (!isValidPhoneLikeValue(nextSettings.phone_number)) return validationText.invalidPhoneNumber;
    if (!isValidPhoneLikeValue(nextSettings.whatsapp_url)) return validationText.invalidWhatsAppNumber;
    if (!isValidMessengerHandle(nextSettings.messenger_url)) return validationText.invalidMessengerHandle;
    if (!isValidTelegramHandle(nextSettings.telegram_url)) return validationText.invalidTelegramHandle;
    if (!isValidUrl(nextSettings.google_maps_url, isGoogleMapsHost)) return validationText.invalidGoogleMapsUrl;
    if (!isValidUrl(nextSettings.facebook_url, (host) => matchesHost(host, ["facebook.com", "fb.com"]))) return validationText.invalidFacebookUrl;
    if (!isValidUrl(nextSettings.instagram_url, (host) => matchesHost(host, ["instagram.com"]))) return validationText.invalidInstagramUrl;
    if (!isValidUrl(nextSettings.tiktok_url, (host) => matchesHost(host, ["tiktok.com"]))) return validationText.invalidTiktokUrl;
    if (nextSettings.service_country && !isValidName(nextSettings.service_country, { min: 2, max: 80 })) return validationText.serviceCountryInvalid;
    if (nextSettings.service_region && !isValidName(nextSettings.service_region, { min: 2, max: 120 })) return validationText.serviceRegionInvalid;
    return "";
  }

  return {
    getSaveErrorMessage,
    getSettingsConflictMessage,
    hasMultipleCategoryIcons: (value) => getGraphemeCount(value) > 1,
    isConfirmedEmailSession: (session) => Boolean(session?.user?.email_confirmed_at || session?.user?.confirmed_at),
    isMissingColumnError,
    isMissingSiteSettingsError,
    isSessionMarkedUnverified: () => globalThis.sessionStorage?.getItem(unverifiedSessionKey) === "1",
    isValidName,
    isValidPrice,
    normalizeAdminSiteSettings,
    normalizeCategoryIcon: (value) => takeFirstGrapheme(value),
    normalizeNameKey,
    takeFirstGrapheme,
    validateSettingsPayload,
  };
}
