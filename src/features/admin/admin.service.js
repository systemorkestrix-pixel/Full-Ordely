import {
  createCategory,
  deleteCategory as deleteCategoryRecord,
  getCategories,
  updateCategory,
} from "../categories/category.service.js";
import {
  getOrders,
  updateOrderStatus as updateOrderStatusRecord,
} from "../orders/order.service.js";
import {
  createProduct,
  deleteProduct as deleteProductRecord,
  getProducts,
  updateProduct,
  updateProductsCategory,
} from "../products/product.service.js";
import {
  getSettings,
  getSiteStats,
  normalizeSiteSettings,
  updateSettings,
  updateTenantSlug,
  validateTenantIdentityConflicts as validateTenantIdentityConflictsApi,
} from "../settings/settings.service.js";
import {
  hasSupabaseConfig,
  onAuthStateChange,
  signOutUser,
} from "../auth/auth.service.js";
import { storageFrom } from "../../core/api/client.js";
import { BASE_SITE_SETTINGS, normalizeUrl } from "../../core/site-settings.js";
import {
  clearTenantContextCache,
  loadAdminTenantContext,
  normalizeTenantSlug,
} from "../../core/tenant-context.js";
import { generateQRCode } from "../../shared/utils/generate-qr.js";
import { mapImagePublicUrl } from "./admin.mapper.js";

export async function uploadImage({ fileName, file }) {
  const { error } = await storageFrom("images").upload(fileName, file);
  return { error };
}

export function getImagePublicUrl(fileName) {
  const { data } = storageFrom("images").getPublicUrl(fileName);
  return mapImagePublicUrl(data);
}

export const adminService = {
  BASE_SITE_SETTINGS,
  normalizeSiteSettings,
  normalizeUrl,
  generateQRCode,
  clearTenantContextCache,
  loadAdminTenantContext,
  normalizeTenantSlug,
  createCategory,
  createProduct,
  deleteCategoryRecord,
  deleteProductRecord,
  getCategories,
  getImagePublicUrl,
  getOrders,
  getProducts,
  getSettings,
  getSiteStats,
  hasSupabaseConfig,
  onAuthStateChange,
  signOutUser,
  updateCategory,
  updateOrderStatusRecord,
  updateProduct,
  updateProductsCategory,
  updateSettings,
  updateTenantSlug,
  uploadImage,
  validateTenantIdentityConflictsApi,
};
