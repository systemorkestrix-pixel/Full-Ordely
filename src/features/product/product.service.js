import { deleteTenantRow, insertTenantRow, updateTenantRow } from "../../core/api/mutation-builder.js";
import { byTenant, from, runQuery } from "../../core/api/query-builder.js";
import { enforceTenant } from "../../core/governor/tenant-guard.js";
import { mapProduct, mapProducts } from "./product.mapper.js";
import { validateProductPatch, validateProductPayload } from "./product.validation.js";

export async function getProducts(tenantId) {
  enforceTenant(tenantId);
  const result = await runQuery(
    byTenant(from("products").select("*"), tenantId).order("id", { ascending: false }),
    { event: "DB_PRODUCTS_FETCH", tenantId, requireTenant: true },
  );

  return { ...result, data: mapProducts(result.data) };
}

export async function createProduct(payload) {
  const nextPayload = validateProductPayload(payload);
  const result = await insertTenantRow("products", nextPayload, { event: "DB_PRODUCT_CREATE" });
  return { ...result, data: mapProduct(result.data) };
}

export async function updateProduct({ productId, tenantId, payload }) {
  const nextPayload = validateProductPatch(payload);
  const result = await updateTenantRow(
    "products",
    { id: productId, tenantId, payload: nextPayload },
    { event: "DB_PRODUCT_UPDATE" },
  );
  return { ...result, data: mapProduct(result.data) };
}

export function deleteProduct({ productId, tenantId }) {
  return deleteTenantRow(
    "products",
    { id: productId, tenantId },
    { event: "DB_PRODUCT_DELETE" },
  );
}

export function updateProductsCategory({ tenantId, oldCategoryName, nextCategoryName }) {
  enforceTenant(tenantId);
  return runQuery(
    byTenant(from("products").update({ category: nextCategoryName }), tenantId)
      .eq("category", oldCategoryName),
    { event: "DB_PRODUCTS_CATEGORY_UPDATE", tenantId, requireTenant: true },
  );
}
