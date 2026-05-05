import { upsertTenantRow } from "../../core/api/mutation-builder.js";
import { byTenant, from, runQuery } from "../../core/api/query-builder.js";
import { normalizeSiteSettings } from "../../core/site-settings.js";
import { updateTenantSlug, validateTenantIdentityConflicts } from "../tenant/tenant.service.js";
import { mapSettings, mapSiteStats } from "./settings.mapper.js";
import { validateSettingsPayload, validateSettingsTenant } from "./settings.validation.js";

export { normalizeSiteSettings, updateTenantSlug, validateTenantIdentityConflicts };

const FALLBACK_SITE_SETTINGS_COLUMNS = [
  "hero_image_url",
  "phone_number",
  "google_maps_url",
  "whatsapp_url",
  "messenger_url",
  "telegram_url",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "orders_enabled",
  "service_country",
  "service_region",
];

const NULLABLE_SITE_SETTINGS_FIELDS = [
  "hero_image_url",
  "phone_number",
  "google_maps_url",
  "whatsapp_url",
  "messenger_url",
  "telegram_url",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "service_country",
  "service_region",
];

function normalizeSettingsWritePayload(payload) {
  const nextPayload = { ...payload };
  NULLABLE_SITE_SETTINGS_FIELDS.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(nextPayload, fieldName) && nextPayload[fieldName] === "") {
      nextPayload[fieldName] = null;
    }
  });
  return nextPayload;
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes("column");
}

export async function getSettings(tenantId) {
  validateSettingsTenant(tenantId);
  const result = await runQuery(
    byTenant(from("site_settings").select("*"), tenantId).maybeSingle(),
    { event: "DB_SETTINGS_FETCH", tenantId, requireTenant: true },
  );
  return { ...result, data: mapSettings(result.data) };
}

export async function updateSettings(payload) {
  const nextPayload = normalizeSettingsWritePayload(validateSettingsPayload(payload));
  if (!nextPayload.id) {
    delete nextPayload.id;
  }
  let result = await upsertTenantRow(
    "site_settings",
    nextPayload,
    { onConflict: "tenant_id" },
    { event: "DB_SETTINGS_UPSERT" },
  );
  while (result.error) {
    const missingColumn = FALLBACK_SITE_SETTINGS_COLUMNS.find((columnName) =>
      Object.prototype.hasOwnProperty.call(nextPayload, columnName) &&
      isMissingColumnError(result.error, columnName));
    if (!missingColumn) break;
    delete nextPayload[missingColumn];
    result = await upsertTenantRow(
      "site_settings",
      nextPayload,
      { onConflict: "tenant_id" },
      { event: "DB_SETTINGS_UPSERT" },
    );
  }
  return { ...result, data: mapSettings(result.data) };
}

export async function getSiteStats(tenantId) {
  validateSettingsTenant(tenantId);
  const result = await runQuery(
    byTenant(from("site_stats").select("*"), tenantId).maybeSingle(),
    { event: "DB_SITE_STATS_FETCH", tenantId, requireTenant: true },
  );
  return { ...result, data: mapSiteStats(result.data) };
}

export function ensureSiteSettingsRow(payload) {
  return upsertTenantRow(
    "site_settings",
    normalizeSettingsWritePayload(validateSettingsPayload(payload)),
    { onConflict: "tenant_id" },
    { event: "DB_SETTINGS_ENSURE" },
  );
}

export function ensureSiteStatsRow(payload) {
  return upsertTenantRow(
    "site_stats",
    validateSettingsPayload(payload),
    { onConflict: "tenant_id" },
    { event: "DB_SITE_STATS_ENSURE" },
  );
}
