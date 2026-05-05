export function mapOrder(row) {
  if (!row) return null;
  return { ...row };
}

export function mapOrders(rows) {
  return Array.isArray(rows) ? rows.map(mapOrder).filter(Boolean) : [];
}
