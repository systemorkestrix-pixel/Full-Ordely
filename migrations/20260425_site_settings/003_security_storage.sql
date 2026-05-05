alter table public.tenants enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.site_stats enable row level security;

drop policy if exists tenants_owner_manage on public.tenants;
create policy tenants_owner_manage
on public.tenants
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists categories_tenant_manage on public.categories;
create policy categories_tenant_manage
on public.categories
for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists products_tenant_manage on public.products;
create policy products_tenant_manage
on public.products
for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists site_settings_tenant_manage on public.site_settings;
create policy site_settings_tenant_manage
on public.site_settings
for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists orders_tenant_manage on public.orders;
create policy orders_tenant_manage
on public.orders
for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists site_stats_tenant_manage on public.site_stats;
create policy site_stats_tenant_manage
on public.site_stats
for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

grant execute on function public.ensure_tenant_support_rows(uuid) to authenticated;
grant execute on function public.email_exists(text) to anon, authenticated;
grant execute on function public.validate_tenant_identity_conflicts(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.provision_tenant_context(text) to authenticated;
grant execute on function public.initialize_signup_tenant(text, text) to authenticated;
grant execute on function public.finalize_signup_contact(text, text) to authenticated;
grant execute on function public.get_storefront(text) to anon, authenticated;
grant execute on function public.create_order(text, uuid, text, text, integer) to anon, authenticated;
grant execute on function public.track_product_click(text, uuid) to anon, authenticated;
grant execute on function public.track_site_visit(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists images_public_read on storage.objects;
create policy images_public_read
on storage.objects
for select
using (bucket_id = 'images');

drop policy if exists images_authenticated_insert on storage.objects;
create policy images_authenticated_insert
on storage.objects
for insert
with check (
  bucket_id = 'images'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = public.current_tenant_id()::text
);

drop policy if exists images_authenticated_update on storage.objects;
create policy images_authenticated_update
on storage.objects
for update
using (
  bucket_id = 'images'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = public.current_tenant_id()::text
)
with check (
  bucket_id = 'images'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = public.current_tenant_id()::text
);

drop policy if exists images_authenticated_delete on storage.objects;
create policy images_authenticated_delete
on storage.objects
for delete
using (
  bucket_id = 'images'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = public.current_tenant_id()::text
);
