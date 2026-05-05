create table if not exists public.data_access_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  table_name text not null,
  record_id text,
  user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint data_access_logs_action_not_empty check (char_length(btrim(action)) > 0),
  constraint data_access_logs_table_name_not_empty check (char_length(btrim(table_name)) > 0)
);

alter table public.data_access_logs enable row level security;

drop policy if exists data_access_logs_tenant_read on public.data_access_logs;
create policy data_access_logs_tenant_read
on public.data_access_logs
for select
using (tenant_id = public.current_tenant_id());

alter table public.tenants
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.categories
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.products
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.site_settings
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.orders
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.site_stats
  add column if not exists created_by uuid references auth.users (id) on delete set null;

update public.tenants
set
  slug = public.slugify(slug),
  store_name = nullif(regexp_replace(btrim(coalesce(store_name, '')), '\s+', ' ', 'g'), '')
where slug <> public.slugify(slug)
  or coalesce(store_name, '') <> coalesce(nullif(regexp_replace(btrim(coalesce(store_name, '')), '\s+', ' ', 'g'), ''), '');

update public.categories
set
  name = btrim(coalesce(name, '')),
  icon = nullif(btrim(icon), '')
where name <> btrim(coalesce(name, ''))
  or coalesce(icon, '') <> coalesce(nullif(btrim(icon), ''), '');

update public.products
set
  name = btrim(coalesce(name, '')),
  category = btrim(coalesce(category, '')),
  image_url = nullif(public.normalize_url_value(image_url), '')
where name <> btrim(coalesce(name, ''))
  or category <> btrim(coalesce(category, ''))
  or coalesce(image_url, '') <> coalesce(nullif(public.normalize_url_value(image_url), ''), '');

update public.orders
set
  product_name = btrim(coalesce(product_name, '')),
  product_category = nullif(btrim(product_category), ''),
  customer_name = regexp_replace(btrim(coalesce(customer_name, '')), '\s+', ' ', 'g'),
  customer_phone = public.normalize_phone_like_value(customer_phone),
  quantity = greatest(coalesce(quantity, 1), 1),
  status = coalesce(nullif(status, ''), 'new')
where product_name <> btrim(coalesce(product_name, ''))
  or coalesce(product_category, '') <> coalesce(nullif(btrim(product_category), ''), '')
  or customer_name <> regexp_replace(btrim(coalesce(customer_name, '')), '\s+', ' ', 'g')
  or customer_phone <> public.normalize_phone_like_value(customer_phone)
  or quantity is null
  or quantity < 1
  or status is null
  or status = '';

alter table public.tenants
  alter column owner_user_id set not null,
  alter column slug set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.categories
  alter column tenant_id set not null,
  alter column name set not null,
  alter column order_index set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.products
  alter column tenant_id set not null,
  alter column name set not null,
  alter column price set not null,
  alter column category set not null,
  alter column is_available set not null,
  alter column click_count set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.site_settings
  alter column tenant_id set not null,
  alter column orders_enabled set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.orders
  alter column tenant_id set not null,
  alter column product_name set not null,
  alter column product_price set not null,
  alter column customer_name set not null,
  alter column customer_phone set not null,
  alter column quantity set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.site_stats
  alter column tenant_id set not null,
  alter column total_visits set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.categories
  drop constraint if exists categories_name_not_empty,
  drop constraint if exists categories_order_index_non_negative;

alter table public.categories
  add constraint categories_name_not_empty check (char_length(btrim(name)) > 0),
  add constraint categories_order_index_non_negative check (order_index >= 0);

alter table public.products
  drop constraint if exists products_name_not_empty,
  drop constraint if exists products_category_not_empty,
  drop constraint if exists products_click_count_non_negative,
  drop constraint if exists products_image_url_http;

alter table public.products
  add constraint products_name_not_empty check (char_length(btrim(name)) > 0),
  add constraint products_category_not_empty check (char_length(btrim(category)) > 0),
  add constraint products_click_count_non_negative check (click_count >= 0),
  add constraint products_image_url_http check (image_url is null or image_url ~* '^https?://');

alter table public.site_settings
  drop constraint if exists site_settings_phone_number_format,
  drop constraint if exists site_settings_whatsapp_url_format,
  drop constraint if exists site_settings_messenger_format,
  drop constraint if exists site_settings_telegram_format,
  drop constraint if exists site_settings_http_urls,
  drop constraint if exists site_settings_service_country_length,
  drop constraint if exists site_settings_service_region_length;

alter table public.site_settings
  add constraint site_settings_phone_number_format check (phone_number is null or phone_number ~ '^\+?[0-9]{8,16}$'),
  add constraint site_settings_whatsapp_url_format check (whatsapp_url is null or whatsapp_url ~ '^\+?[0-9]{8,16}$'),
  add constraint site_settings_messenger_format check (messenger_url is null or messenger_url ~ '^[A-Za-z0-9._-]{3,80}$'),
  add constraint site_settings_telegram_format check (telegram_url is null or telegram_url ~ '^@[A-Za-z0-9_]{5,32}$'),
  add constraint site_settings_http_urls check (
    (hero_image_url is null or hero_image_url ~* '^https?://')
    and (google_maps_url is null or google_maps_url ~* '^https?://')
    and (facebook_url is null or facebook_url ~* '^https?://')
    and (instagram_url is null or instagram_url ~* '^https?://')
    and (tiktok_url is null or tiktok_url ~* '^https?://')
  ),
  add constraint site_settings_service_country_length check (service_country is null or char_length(service_country) between 2 and 80),
  add constraint site_settings_service_region_length check (service_region is null or char_length(service_region) between 2 and 120);

alter table public.orders
  drop constraint if exists orders_product_name_not_empty,
  drop constraint if exists orders_customer_name_not_empty,
  drop constraint if exists orders_customer_phone_format,
  drop constraint if exists orders_quantity_range;

alter table public.orders
  add constraint orders_product_name_not_empty check (char_length(btrim(product_name)) > 0),
  add constraint orders_customer_name_not_empty check (char_length(btrim(customer_name)) between 2 and 120),
  add constraint orders_customer_phone_format check (customer_phone ~ '^\+?[0-9]{8,16}$'),
  add constraint orders_quantity_range check (quantity between 1 and 99);

alter table public.site_stats
  drop constraint if exists site_stats_total_visits_non_negative;

alter table public.site_stats
  add constraint site_stats_total_visits_non_negative check (total_visits >= 0);

create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null and auth.uid() is not null then
    new.created_by = auth.uid();
  end if;

  return new;
exception
  when undefined_column then
    return new;
end;
$$;

create or replace function public.audit_data_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  target_record_id text;
  target_action text := lower(tg_op);
begin
  if tg_table_name = 'data_access_logs' then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'tenants' then
    if tg_op = 'DELETE' then
      target_tenant_id := old.id;
      target_record_id := old.id::text;
    else
      target_tenant_id := new.id;
      target_record_id := new.id::text;
    end if;
  elsif tg_op = 'DELETE' then
    target_tenant_id := old.tenant_id;
    target_record_id := old.id::text;
  else
    target_tenant_id := new.tenant_id;
    target_record_id := new.id::text;
  end if;

  insert into public.data_access_logs (
    action,
    table_name,
    record_id,
    user_id,
    tenant_id,
    metadata
  )
  values (
    target_action,
    tg_table_name,
    target_record_id,
    auth.uid(),
    target_tenant_id,
    jsonb_build_object('schema', tg_table_schema)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists set_tenants_created_by on public.tenants;
create trigger set_tenants_created_by
before insert on public.tenants
for each row
execute function public.set_created_by();

drop trigger if exists set_categories_created_by on public.categories;
create trigger set_categories_created_by
before insert on public.categories
for each row
execute function public.set_created_by();

drop trigger if exists set_products_created_by on public.products;
create trigger set_products_created_by
before insert on public.products
for each row
execute function public.set_created_by();

drop trigger if exists set_site_settings_created_by on public.site_settings;
create trigger set_site_settings_created_by
before insert on public.site_settings
for each row
execute function public.set_created_by();

drop trigger if exists set_orders_created_by on public.orders;
create trigger set_orders_created_by
before insert on public.orders
for each row
execute function public.set_created_by();

drop trigger if exists set_site_stats_created_by on public.site_stats;
create trigger set_site_stats_created_by
before insert on public.site_stats
for each row
execute function public.set_created_by();

drop trigger if exists audit_tenants_changes on public.tenants;
create trigger audit_tenants_changes
after insert or update or delete on public.tenants
for each row
execute function public.audit_data_change();

drop trigger if exists audit_categories_changes on public.categories;
create trigger audit_categories_changes
after insert or update or delete on public.categories
for each row
execute function public.audit_data_change();

drop trigger if exists audit_products_changes on public.products;
create trigger audit_products_changes
after insert or update or delete on public.products
for each row
execute function public.audit_data_change();

drop trigger if exists audit_site_settings_changes on public.site_settings;
create trigger audit_site_settings_changes
after insert or update or delete on public.site_settings
for each row
execute function public.audit_data_change();

drop trigger if exists audit_orders_changes on public.orders;
create trigger audit_orders_changes
after insert or update or delete on public.orders
for each row
execute function public.audit_data_change();

drop trigger if exists audit_site_stats_changes on public.site_stats;
create trigger audit_site_stats_changes
after insert or update or delete on public.site_stats
for each row
execute function public.audit_data_change();

grant select on public.data_access_logs to authenticated;
