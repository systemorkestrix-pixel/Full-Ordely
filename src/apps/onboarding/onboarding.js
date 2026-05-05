import {
  getSession,
  getSettings,
  hasSupabaseConfig,
  updateSettings,
  updateTenantSlug,
  BASE_SITE_SETTINGS,
  normalizeContact,
  normalizePhoneNumber,
  normalizeSiteSettings,
  loadAdminTenantContext,
  normalizeTenantSlug,
  validateOnboardingFields,
} from "../../features/onboarding/onboarding.service.js";
import { AUTH_UI_TEXT, HTML_PAGE_UI_TEXT_AR } from "../../shared/constants/ui-text.ar.js";
import { applyPageCopy } from "../../shared/ui/apply-page-copy.js";
import { createIcon } from "../../shared/ui/visual/icons.js";
import { runtimeGuard, state, setState } from "./onboarding.state.js";

const ONBOARDING_UI_TEXT = AUTH_UI_TEXT.onboarding;
const AUTH_COPY = AUTH_UI_TEXT.copy;
const form = document.getElementById("onboardingForm");
const slugField = document.getElementById("onboardingStoreSlug");
const contactField = document.getElementById("onboardingContact");
const submitBtn = document.getElementById("onboardingSubmitBtn");
const feedback = document.getElementById("onboardingFeedback");
const pointsSlot = document.getElementById("onboardingPoints");
const slugPreview = document.getElementById("slugPreview");
const slugPreviewUrl = document.getElementById("slugPreviewUrl");
const contactHint = document.getElementById("contactHint");
const onboardingIcon = document.getElementById("onboardingIcon");

applyPageCopy(HTML_PAGE_UI_TEXT_AR.onboardingPage);
runtimeGuard.assertUiConsistency("onboarding", [".auth-shell", ".auth-layout"]);

function getStoreBaseUrl() {
  return window.location.origin;
}

function buildSlugPreviewUrl(slug) {
  const normalizedSlug = normalizeTenantSlug(slug);
  if (!normalizedSlug) return "";
  return `${getStoreBaseUrl()}/s/${normalizedSlug}`;
}

function detectContactType(value) {
  const cleaned = String(value || "").replace(/\s+/g, "");
  if (!cleaned) return null;
  if (/^0[5-9]\d{8}$/.test(cleaned) || /^\+\d{10,15}$/.test(cleaned)) {
    return "whatsapp";
  }
  if (/^\d{7,15}$/.test(cleaned)) {
    return "phone";
  }
  return null;
}

function setFeedback(message = "", type = "error") {
  feedback.textContent = message;
  feedback.className = "auth-feedback";
  if (!message) return;
  feedback.classList.add("is-visible");
  feedback.classList.add(type === "success" ? "is-success" : "is-error");
}

function revealOnboarding() {
  document.body.classList.remove("auth-is-resolving");
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

function setFormDisabled(isDisabled) {
  [slugField, contactField, submitBtn].forEach((field) => {
    if (field) field.disabled = isDisabled;
  });
}

function updateSlugPreview() {
  const value = slugField.value;
  const previewUrl = buildSlugPreviewUrl(value);

  if (previewUrl) {
    slugPreviewUrl.textContent = previewUrl;
    slugPreview.hidden = false;
  } else {
    slugPreview.hidden = true;
  }
}

function updateContactHint() {
  const value = contactField.value;
  const type = detectContactType(value);

  if (!value || !type) {
    contactHint.hidden = true;
    return;
  }

  const hintText = type === "whatsapp"
    ? ONBOARDING_UI_TEXT.contactHintWhatsapp
    : ONBOARDING_UI_TEXT.contactHintPhone;

  contactHint.hidden = false;
  contactHint.innerHTML = `${createIcon("check", "sm")} <span>${hintText}</span>`;
  contactHint.className = `auth-onboarding-contact-hint auth-onboarding-contact-hint--${type}`;
}

function renderVisuals() {
  if (onboardingIcon) {
    onboardingIcon.innerHTML = createIcon("box", "lg");
  }

  if (pointsSlot) {
    pointsSlot.innerHTML = ONBOARDING_UI_TEXT.points
      .map(([title, description], index) => `
        <article class="auth-point${index === 2 ? " layout-density-optional" : ""}">
          ${createIcon("check", "sm")}
          <div>
            <strong>${title}</strong>
            <span>${description}</span>
          </div>
        </article>
      `)
      .join("");
  }
}

function getValidationMessage() {
  const slug = normalizeTenantSlug(slugField.value);
  const contact = normalizeContact(contactField.value);
  slugField.value = slug;
  contactField.value = contact;
  return validateOnboardingFields({ slug, contact });
}

async function loadExistingSettings(tenantId) {
  const { data, error } = await getSettings(tenantId);
  if (error) throw error;
  return {
    ...normalizeSiteSettings(data || BASE_SITE_SETTINGS),
    id: data?.id || "",
  };
}

async function completeOnboarding() {
  runtimeGuard.trace("ONBOARDING_SUBMIT_STARTED", {});
  const validationMessage = getValidationMessage();

  if (validationMessage) {
    runtimeGuard.trace("ONBOARDING_VALIDATION_FAILED", {});
    setFeedback(validationMessage);
    return;
  }

  setFormDisabled(true);
  submitBtn.textContent = ONBOARDING_UI_TEXT.saving;

  try {
    const slug = normalizeTenantSlug(slugField.value);
    const contact = normalizeContact(contactField.value);
    const tenant = await loadAdminTenantContext({
      session: state.session.user,
      slugHint: slug,
      force: true,
    });
    runtimeGuard.trace("ONBOARDING_TENANT_LOADED", { tenantId: tenant.id });

    const { data: tenantRecord, error: tenantError } = await updateTenantSlug({
      tenantId: tenant.id,
      ownerUserId: state.session.user.user.id,
      slug,
    });

    if (tenantError) throw tenantError;

    const nextTenant = tenantRecord || { ...tenant, slug };
    runtimeGuard.trace("ONBOARDING_TENANT_SLUG_UPDATED", { tenantId: nextTenant.id, slug });

    const existingSettings = await loadExistingSettings(tenant.id);
    const normalizedContact = normalizePhoneNumber(contact);
    const nextSettings = normalizeSiteSettings({
      ...existingSettings,
      phone_number: normalizedContact,
      whatsapp_url: normalizedContact,
      orders_enabled: false,
    });

    const settingsPayload = {
      tenant_id: nextTenant.id,
      ...nextSettings,
      ...(existingSettings.id ? { id: existingSettings.id } : {}),
    };
    const { error } = await updateSettings(settingsPayload);

    if (error) throw error;

    runtimeGuard.trace("ONBOARDING_COMPLETED", { tenantId: nextTenant.id });
    window.location.replace("/admin");
  } catch (error) {
    console.error("Onboarding setup failed:", error);
    setFeedback(ONBOARDING_UI_TEXT.saveFailed);
    setFormDisabled(false);
    submitBtn.textContent = AUTH_COPY.setupSubmit;
  }
}

async function bootOnboarding() {
  renderVisuals();

  if (!hasSupabaseConfig) {
    setFeedback(ONBOARDING_UI_TEXT.serviceUnavailable);
    setFormDisabled(true);
    revealOnboarding();
    return;
  }

  const { data, error } = await getSession();
  if (error) throw error;

  if (!data?.session?.user) {
    runtimeGuard.trace("ONBOARDING_SESSION_MISSING", {});
    window.location.replace("/auth");
    return;
  }

  setState({ session: { user: data.session } });
  runtimeGuard.trace("ONBOARDING_SESSION_LOADED", { userId: data.session.user.id });

  const emailPrefix = normalizeTenantSlug(data.session.user.email?.split("@")[0] || "my-store");
  slugField.value = emailPrefix;
  updateSlugPreview();

  revealOnboarding();
}

slugField.addEventListener("input", () => {
  runtimeGuard.trackEvent("onboarding.slug.input");
  updateSlugPreview();
});

slugField.addEventListener("change", () => {
  runtimeGuard.trackEvent("onboarding.slug.change");
  slugField.value = normalizeTenantSlug(slugField.value);
  updateSlugPreview();
});

contactField.addEventListener("input", () => {
  runtimeGuard.trackEvent("onboarding.contact.input");
  updateContactHint();
});

form.addEventListener("submit", (event) => {
  runtimeGuard.trackEvent("onboarding.submit");
  event.preventDefault();
  setFeedback("");
  completeOnboarding();
});

bootOnboarding().catch((error) => {
  console.error("Onboarding boot failed:", error);
  setFeedback(ONBOARDING_UI_TEXT.bootFailed);
  revealOnboarding();
});
