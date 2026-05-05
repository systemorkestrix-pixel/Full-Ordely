const STORE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTACT_REGEX = /^[+\d][\d\s().-]{6,31}$/;

export function normalizeContact(value) {
  return String(value || "").trim();
}

export function validateOnboardingFields({ slug, contact }) {
  if (!slug || !contact) {
    return "أكمل بيانات المتجر";
  }

  if (!STORE_SLUG_REGEX.test(slug) || slug.length < 3 || slug.length > 60) {
    return "رابط المتجر غير صحيح";
  }

  if (!CONTACT_REGEX.test(contact)) {
    return "رقم التواصل غير صحيح";
  }

  return "";
}

export function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}
