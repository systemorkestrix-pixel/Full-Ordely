import {
  getSession,
  hasSupabaseConfig,
} from "../../core/api.js";
import {
  BASE_SITE_SETTINGS,
  normalizePhoneNumber,
  normalizeSiteSettings,
} from "../../core/site-settings.js";
import {
  loadAdminTenantContext,
  normalizeTenantSlug,
} from "../../core/tenant-context.js";
import { getSettings, updateSettings } from "../settings/settings.service.js";
import { updateTenantSlug } from "../tenant/tenant.service.js";
import { isEmailConfirmed, normalizeContact, validateOnboardingFields } from "./onboarding.validation.js";

export {
  BASE_SITE_SETTINGS,
  getSession,
  getSettings,
  hasSupabaseConfig,
  isEmailConfirmed,
  loadAdminTenantContext,
  normalizeContact,
  normalizePhoneNumber,
  normalizeSiteSettings,
  normalizeTenantSlug,
  updateSettings,
  updateTenantSlug,
  validateOnboardingFields,
};
