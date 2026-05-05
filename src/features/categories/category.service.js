import { deleteTenantRow, insertTenantRow, updateTenantRow } from "../../core/api/mutation-builder.js";
import { byTenant, from, runQuery } from "../../core/api/query-builder.js";
import { enforceTenant } from "../../core/governor/tenant-guard.js";
import { mapCategories, mapCategory } from "./category.mapper.js";
import { validateCategoryPatch, validateCategoryPayload } from "./category.validation.js";

export async function getCategories(tenantId, { ordered = true } = {}) {
  enforceTenant(tenantId);
  let query = byTenant(from("categories").select("*"), tenantId);

  if (ordered) {
    query = query.order("order_index");
  }

  const result = await runQuery(query, { event: "DB_CATEGORIES_FETCH", tenantId, requireTenant: true });
  return { ...result, data: mapCategories(result.data) };
}

export async function createCategory(payload) {
  const nextPayload = validateCategoryPayload(payload);
  const result = await insertTenantRow("categories", nextPayload, { event: "DB_CATEGORY_CREATE" });
  return { ...result, data: mapCategory(result.data) };
}

export async function updateCategory({ categoryId, tenantId, payload }) {
  const nextPayload = validateCategoryPatch(payload);
  const result = await updateTenantRow(
    "categories",
    { id: categoryId, tenantId, payload: nextPayload },
    { event: "DB_CATEGORY_UPDATE" },
  );
  return { ...result, data: mapCategory(result.data) };
}

export function deleteCategory({ categoryId, tenantId }) {
  return deleteTenantRow(
    "categories",
    { id: categoryId, tenantId },
    { event: "DB_CATEGORY_DELETE" },
  );
}

export function normalizeCategoryPayload(payload) {
  return {
    ...payload,
    name: String(payload.name || '').trim(),
    icon: String(payload.icon || '').trim(),
    order_index: Number.parseInt(payload.order_index, 10) || 0,
  };
}
