import { requirePayloadObject, requireString } from "../../core/governor/validation-guard.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

export function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function getPasswordValidationMessage(password, text) {
  if (password.length < PASSWORD_MIN_LENGTH) return text.passwordTooShort;
  if (password.length > PASSWORD_MAX_LENGTH) return text.passwordTooLong;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return text.passwordNeedsLettersAndNumbers;
  }

  return "";
}

export function validateAuthFields(email, password, { mode, text }) {
  if (!email || !password) return text.accountFieldsRequired;
  if (!EMAIL_REGEX.test(email)) return text.emailInvalid;
  return mode === "signup" ? getPasswordValidationMessage(password, text) : "";
}

export function validateAuthPayload(payload) {
  requirePayloadObject(payload, "INVALID_AUTH_PAYLOAD");
  return {
    email: requireString(payload.email, "INVALID_EMAIL", { min: 3, max: 254 }),
    password: requireString(payload.password, "INVALID_PASSWORD", { min: 1, max: 128 }),
  };
}
