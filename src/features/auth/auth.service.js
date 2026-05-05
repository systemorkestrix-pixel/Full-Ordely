import {
  getCurrentUser,
  getSession,
  hasSupabaseConfig,
  onAuthStateChange,
  signInWithPassword,
  signOutUser,
  signUpUser,
} from "../../core/api.js";
import { safeNextPath } from "../../core/guards.js";
import { getTenantByOwner } from "../tenant/tenant.service.js";
import { sanitizeEmail, validateAuthFields, validateAuthPayload } from "./auth.validation.js";

export {
  getCurrentUser,
  getSession,
  getTenantByOwner,
  hasSupabaseConfig,
  onAuthStateChange,
  sanitizeEmail,
  signInWithPassword,
  signOutUser,
  signUpUser,
  safeNextPath,
  validateAuthFields,
  validateAuthPayload,
};
