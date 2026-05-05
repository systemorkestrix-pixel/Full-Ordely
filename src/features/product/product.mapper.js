export function mapProduct(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    price: row.price,
    category: row.category,
    is_available: row.is_available,
    image_url: row.image_url || "",
    click_count: row.click_count ?? 0,
    created_at: row.created_at,
  };
}

export function mapProducts(rows) {
  return Array.isArray(rows) ? rows.map(mapProduct).filter(Boolean) : [];
}
