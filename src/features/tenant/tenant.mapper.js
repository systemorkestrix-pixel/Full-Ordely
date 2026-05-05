export function mapTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    slug: row.slug,
    created_at: row.created_at,
  };
}
