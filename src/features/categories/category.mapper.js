export function mapCategory(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    icon: row.icon || "",
    order_index: row.order_index ?? 0,
    created_at: row.created_at,
  };
}

export function mapCategories(rows) {
  return Array.isArray(rows) ? rows.map(mapCategory).filter(Boolean) : [];
}
