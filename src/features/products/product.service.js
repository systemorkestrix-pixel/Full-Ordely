export {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  updateProductsCategory,
} from "../product/product.service.js";

export function normalizeProductPayload(payload) {
  return {
    ...payload,
    name: String(payload.name || '').trim(),
    price: Number.parseFloat(payload.price) || 0,
    category: String(payload.category || '').trim(),
    is_available: payload.is_available ?? true,
    image_url: String(payload.image_url || '').trim(),
  };
}
