create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  begin
    new.updated_at = timezone('utc', now());
  exception
    when undefined_column then
      return new;
  end;
  return new;
end;
$$;

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.normalize_phone_like_value(value text)
returns text
language sql
immutable
as $$
  with prepared as (
    select regexp_replace(btrim(coalesce(value, '')), '[^0-9+]', '', 'g') as compact_value
  )
  select case
    when compact_value = '' then ''
    when left(compact_value, 1) = '+' then '+' || replace(substr(compact_value, 2), '+', '')
    else replace(compact_value, '+', '')
  end
  from prepared;
$$;

create or replace function public.normalize_handle_value(value text)
returns text
language sql
immutable
as $$
  select trim(both '/' from regexp_replace(regexp_replace(btrim(coalesce(value, '')), '^@+', ''), '^/+', ''));
$$;

create or replace function public.normalize_telegram_value(value text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_handle_value(value) = '' then ''
    else '@' || public.normalize_handle_value(value)
  end;
$$;

create or replace function public.normalize_url_value(value text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := btrim(coalesce(value, ''));
begin
  if normalized = '' then
    return '';
  end if;

  if normalized !~* '^https?://' then
    normalized := 'https://' || regexp_replace(normalized, '^/+', '');
  end if;

  normalized := regexp_replace(normalized, '/+$', '');
  return normalized;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  slug text not null,
  store_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.tenants
  add column if not exists owner_user_id uuid;

alter table public.tenants
  add column if not exists slug text;

alter table public.tenants
  add column if not exists store_name text;

alter table public.tenants
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.tenants
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.tenants
set
  slug = public.slugify(slug),
  store_name = nullif(regexp_replace(btrim(coalesce(store_name, '')), '\s+', ' ', 'g'), ''),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where created_at is null or updated_at is null or slug is null or store_name <> nullif(regexp_replace(btrim(coalesce(store_name, '')), '\s+', ' ', 'g'), '');

create unique index if not exists tenants_owner_user_id_unique_idx
  on public.tenants (owner_user_id);

create unique index if not exists tenants_slug_unique_idx
  on public.tenants (lower(slug));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  icon text,
  order_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.categories
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.categories
  add column if not exists icon text;

alter table public.categories
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.categories
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.categories
set
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where created_at is null or updated_at is null;

drop index if exists categories_name_unique_idx;
drop index if exists categories_tenant_name_unique_idx;

update public.categories
set
  name = btrim(name),
  icon = nullif(btrim(icon), '')
where name <> btrim(name)
  or coalesce(icon, '') <> coalesce(nullif(btrim(icon), ''), '');

create unique index if not exists categories_tenant_name_unique_idx
  on public.categories (tenant_id, lower(btrim(name)));

create index if not exists categories_tenant_order_idx
  on public.categories (tenant_id, order_index asc, created_at asc);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  category text not null,
  is_available boolean not null default true,
  click_count bigint not null default 0,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.products
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.products
  add column if not exists click_count bigint default 0;

alter table public.products
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.products
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.products
set
  click_count = coalesce(click_count, 0),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where click_count is null or created_at is null or updated_at is null;

alter table public.products
  alter column click_count set default 0;

alter table public.products
  drop constraint if exists products_category_fk;

update public.products
set
  name = btrim(name),
  category = btrim(category)
where name <> btrim(name)
  or category <> btrim(category);

create unique index if not exists products_tenant_name_unique_idx
  on public.products (tenant_id, lower(btrim(name)));

create index if not exists products_tenant_category_idx
  on public.products (tenant_id, category);

create index if not exists products_tenant_available_idx
  on public.products (tenant_id, is_available);

create index if not exists products_tenant_created_idx
  on public.products (tenant_id, created_at desc);

create table if not exists public.site_settings (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  hero_image_url text,
  phone_number text,
  google_maps_url text,
  whatsapp_url text,
  messenger_url text,
  telegram_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  orders_enabled boolean not null default false,
  service_country text,
  service_region text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_settings
  drop constraint if exists site_settings_singleton;

alter table public.site_settings
  alter column id set default gen_random_uuid()::text;

alter table public.site_settings
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.site_settings
  add column if not exists hero_image_url text;

alter table public.site_settings
  add column if not exists phone_number text;

alter table public.site_settings
  add column if not exists google_maps_url text;

alter table public.site_settings
  add column if not exists whatsapp_url text;

alter table public.site_settings
  add column if not exists messenger_url text;

alter table public.site_settings
  add column if not exists telegram_url text;

alter table public.site_settings
  add column if not exists facebook_url text;

alter table public.site_settings
  add column if not exists instagram_url text;

alter table public.site_settings
  add column if not exists tiktok_url text;

alter table public.site_settings
  add column if not exists orders_enabled boolean default false;

alter table public.site_settings
  add column if not exists service_country text;

alter table public.site_settings
  add column if not exists service_region text;

alter table public.site_settings
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.site_settings
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.site_settings
set
  orders_enabled = coalesce(orders_enabled, false),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where orders_enabled is null or created_at is null or updated_at is null;

update public.site_settings
set
  hero_image_url = nullif(public.normalize_url_value(hero_image_url), ''),
  phone_number = nullif(public.normalize_phone_like_value(phone_number), ''),
  google_maps_url = nullif(public.normalize_url_value(google_maps_url), ''),
  whatsapp_url = nullif(public.normalize_phone_like_value(whatsapp_url), ''),
  messenger_url = nullif(public.normalize_handle_value(messenger_url), ''),
  telegram_url = nullif(public.normalize_telegram_value(telegram_url), ''),
  facebook_url = nullif(public.normalize_url_value(facebook_url), ''),
  instagram_url = nullif(public.normalize_url_value(instagram_url), ''),
  tiktok_url = nullif(public.normalize_url_value(tiktok_url), ''),
  service_country = nullif(regexp_replace(btrim(coalesce(service_country, '')), '\s+', ' ', 'g'), ''),
  service_region = nullif(regexp_replace(btrim(coalesce(service_region, '')), '\s+', ' ', 'g'), '');

create unique index if not exists site_settings_tenant_unique_idx
  on public.site_settings (tenant_id);

create unique index if not exists site_settings_phone_number_unique_idx
  on public.site_settings (public.normalize_phone_like_value(phone_number))
  where nullif(public.normalize_phone_like_value(phone_number), '') is not null;

create unique index if not exists site_settings_google_maps_url_unique_idx
  on public.site_settings (lower(public.normalize_url_value(google_maps_url)))
  where nullif(public.normalize_url_value(google_maps_url), '') is not null;

create unique index if not exists site_settings_whatsapp_url_unique_idx
  on public.site_settings (public.normalize_phone_like_value(whatsapp_url))
  where nullif(public.normalize_phone_like_value(whatsapp_url), '') is not null;

create unique index if not exists site_settings_messenger_url_unique_idx
  on public.site_settings (lower(public.normalize_handle_value(messenger_url)))
  where nullif(public.normalize_handle_value(messenger_url), '') is not null;

create unique index if not exists site_settings_telegram_url_unique_idx
  on public.site_settings (lower(public.normalize_telegram_value(telegram_url)))
  where nullif(public.normalize_telegram_value(telegram_url), '') is not null;

create unique index if not exists site_settings_facebook_url_unique_idx
  on public.site_settings (lower(public.normalize_url_value(facebook_url)))
  where nullif(public.normalize_url_value(facebook_url), '') is not null;

create unique index if not exists site_settings_instagram_url_unique_idx
  on public.site_settings (lower(public.normalize_url_value(instagram_url)))
  where nullif(public.normalize_url_value(instagram_url), '') is not null;

create unique index if not exists site_settings_tiktok_url_unique_idx
  on public.site_settings (lower(public.normalize_url_value(tiktok_url)))
  where nullif(public.normalize_url_value(tiktok_url), '') is not null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_id uuid references public.products (id) on update cascade on delete set null,
  product_name text not null,
  product_price numeric(10, 2) not null check (product_price >= 0),
  product_category text,
  customer_name text not null,
  customer_phone text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'new' check (status in ('new', 'processing', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.orders
  add column if not exists product_id uuid references public.products (id) on update cascade on delete set null;

alter table public.orders
  add column if not exists product_name text;

alter table public.orders
  add column if not exists product_price numeric(10, 2);

alter table public.orders
  add column if not exists product_category text;

alter table public.orders
  add column if not exists customer_name text;

alter table public.orders
  add column if not exists customer_phone text;

alter table public.orders
  add column if not exists quantity integer default 1;

alter table public.orders
  add column if not exists status text default 'new';

alter table public.orders
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.orders
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.orders
set
  status = coalesce(nullif(status, ''), 'new'),
  quantity = coalesce(quantity, 1),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where status is null or quantity is null or created_at is null or updated_at is null;

create index if not exists orders_tenant_status_idx
  on public.orders (tenant_id, status);

create index if not exists orders_tenant_created_idx
  on public.orders (tenant_id, created_at desc);

create index if not exists orders_tenant_product_idx
  on public.orders (tenant_id, product_id);

create table if not exists public.site_stats (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  total_visits bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_stats
  drop constraint if exists site_stats_singleton;

alter table public.site_stats
  alter column id set default gen_random_uuid()::text;

alter table public.site_stats
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

alter table public.site_stats
  add column if not exists total_visits bigint default 0;

alter table public.site_stats
  add column if not exists created_at timestamptz default timezone('utc', now());

alter table public.site_stats
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.site_stats
set
  total_visits = coalesce(total_visits, 0),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where total_visits is null or created_at is null or updated_at is null;

create unique index if not exists site_stats_tenant_unique_idx
  on public.site_stats (tenant_id);

update public.site_settings
set
  hero_image_url = case
    when hero_image_url = 'https://i.ibb.co/3KcTXDy/1633-x-500.png' then null
    else hero_image_url
  end,
  phone_number = case
    when phone_number = '0673740332' then null
    else phone_number
  end,
  google_maps_url = case
    when google_maps_url = 'https://maps.app.goo.gl/7WS3F2kLbbaA58F27' then null
    else google_maps_url
  end;

