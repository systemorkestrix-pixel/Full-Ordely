create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select id
  from public.tenants
  where owner_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.email_exists(target_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(btrim(coalesce(target_email, '')))
  );
$$;

create or replace function public.validate_tenant_identity_conflicts(
  target_tenant_id uuid,
  target_slug text default '',
  target_phone_number text default '',
  target_google_maps_url text default '',
  target_whatsapp_url text default '',
  target_messenger_url text default '',
  target_telegram_url text default '',
  target_facebook_url text default '',
  target_instagram_url text default '',
  target_tiktok_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slug_conflict boolean := false;
  phone_conflict boolean := false;
  google_maps_conflict boolean := false;
  whatsapp_conflict boolean := false;
  messenger_conflict boolean := false;
  telegram_conflict boolean := false;
  facebook_conflict boolean := false;
  instagram_conflict boolean := false;
  tiktok_conflict boolean := false;
  normalized_slug text := public.slugify(target_slug);
  normalized_phone text := public.normalize_phone_like_value(target_phone_number);
  normalized_google_maps text := public.normalize_url_value(target_google_maps_url);
  normalized_whatsapp text := public.normalize_phone_like_value(target_whatsapp_url);
  normalized_messenger text := lower(public.normalize_handle_value(target_messenger_url));
  normalized_telegram text := lower(public.normalize_telegram_value(target_telegram_url));
  normalized_facebook text := lower(public.normalize_url_value(target_facebook_url));
  normalized_instagram text := lower(public.normalize_url_value(target_instagram_url));
  normalized_tiktok text := lower(public.normalize_url_value(target_tiktok_url));
begin
  if normalized_slug <> '' then
    select exists (
      select 1
      from public.tenants
      where (target_tenant_id is null or id <> target_tenant_id)
        and lower(slug) = lower(normalized_slug)
    )
    into slug_conflict;
  end if;

  if normalized_phone <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and public.normalize_phone_like_value(phone_number) = normalized_phone
    )
    into phone_conflict;
  end if;

  if normalized_google_maps <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_url_value(google_maps_url)) = normalized_google_maps
    )
    into google_maps_conflict;
  end if;

  if normalized_whatsapp <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and public.normalize_phone_like_value(whatsapp_url) = normalized_whatsapp
    )
    into whatsapp_conflict;
  end if;

  if normalized_messenger <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_handle_value(messenger_url)) = normalized_messenger
    )
    into messenger_conflict;
  end if;

  if normalized_telegram <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_telegram_value(telegram_url)) = normalized_telegram
    )
    into telegram_conflict;
  end if;

  if normalized_facebook <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_url_value(facebook_url)) = normalized_facebook
    )
    into facebook_conflict;
  end if;

  if normalized_instagram <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_url_value(instagram_url)) = normalized_instagram
    )
    into instagram_conflict;
  end if;

  if normalized_tiktok <> '' then
    select exists (
      select 1
      from public.site_settings
      where (target_tenant_id is null or tenant_id <> target_tenant_id)
        and lower(public.normalize_url_value(tiktok_url)) = normalized_tiktok
    )
    into tiktok_conflict;
  end if;

  return jsonb_build_object(
    'slug', slug_conflict,
    'phone_number', phone_conflict,
    'google_maps_url', google_maps_conflict,
    'whatsapp_url', whatsapp_conflict,
    'messenger_url', messenger_conflict,
    'telegram_url', telegram_conflict,
    'facebook_url', facebook_conflict,
    'instagram_url', instagram_conflict,
    'tiktok_url', tiktok_conflict,
    'has_conflicts',
      slug_conflict
      or phone_conflict
      or google_maps_conflict
      or whatsapp_conflict
      or messenger_conflict
      or telegram_conflict
      or facebook_conflict
      or instagram_conflict
      or tiktok_conflict
  );
end;
$$;

create or replace function public.ensure_tenant_support_rows(target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_tenant_id is null then
    return;
  end if;

  insert into public.site_settings (id, tenant_id)
  values (gen_random_uuid()::text, target_tenant_id)
  on conflict (tenant_id) do nothing;

  insert into public.site_stats (id, tenant_id)
  values (gen_random_uuid()::text, target_tenant_id)
  on conflict (tenant_id) do nothing;

  insert into public.categories (tenant_id, name, icon, order_index)
  select target_tenant_id, 'عام', '📦', 0
  where not exists (
    select 1
    from public.categories
    where tenant_id = target_tenant_id
  );
end;
$$;

create or replace function public.provision_tenant_context(requested_slug text default '')
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_tenant public.tenants;
  normalized_slug text;
  candidate_slug text;
  slug_suffix integer := 0;
  tenant_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = auth.uid()
  ) then
    raise exception 'auth_user_missing';
  end if;

  select *
  into resolved_tenant
  from public.tenants
  where owner_user_id = auth.uid()
  limit 1;

  if found then
    perform public.ensure_tenant_support_rows(resolved_tenant.id);
    return resolved_tenant;
  end if;

  normalized_slug := public.slugify(requested_slug);
  if normalized_slug = '' then
    normalized_slug := 'store';
  end if;

  candidate_slug := normalized_slug;

  while exists (
    select 1
    from public.tenants
    where lower(slug) = lower(candidate_slug)
  ) loop
    slug_suffix := slug_suffix + 1;
    candidate_slug := normalized_slug || '-' || slug_suffix::text;
  end loop;

  insert into public.tenants (owner_user_id, slug)
  values (auth.uid(), candidate_slug)
  returning *
  into resolved_tenant;

  select count(*)
  into tenant_count
  from public.tenants;

  if tenant_count = 1 then
    update public.categories
    set tenant_id = resolved_tenant.id
    where tenant_id is null;

    update public.products
    set tenant_id = resolved_tenant.id
    where tenant_id is null;

    update public.orders
    set tenant_id = resolved_tenant.id
    where tenant_id is null;

    update public.site_settings
    set tenant_id = resolved_tenant.id
    where tenant_id is null;

    update public.site_stats
    set tenant_id = resolved_tenant.id
    where tenant_id is null;
  end if;

  perform public.ensure_tenant_support_rows(resolved_tenant.id);
  return resolved_tenant;
end;
$$;

create or replace function public.initialize_signup_tenant(
  store_name_input text,
  store_slug_input text
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_tenant public.tenants;
  normalized_name text := regexp_replace(btrim(coalesce(store_name_input, '')), '\s+', ' ', 'g');
  raw_slug text := btrim(coalesce(store_slug_input, ''));
  normalized_slug text := public.slugify(store_slug_input);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = auth.uid()
  ) then
    raise exception 'auth_user_missing';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 80 then
    raise exception 'invalid_store_name';
  end if;

  if raw_slug = '' or raw_slug <> normalized_slug or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_store_slug';
  end if;

  if exists (
    select 1
    from public.tenants
    where owner_user_id <> auth.uid()
      and lower(slug) = lower(normalized_slug)
  ) then
    raise exception 'store_slug_exists';
  end if;

  select *
  into resolved_tenant
  from public.tenants
  where owner_user_id = auth.uid()
  limit 1;

  if found then
    update public.tenants
    set
      store_name = normalized_name,
      slug = normalized_slug
    where id = resolved_tenant.id
      and owner_user_id = auth.uid()
    returning *
    into resolved_tenant;
  else
    insert into public.tenants (owner_user_id, slug, store_name)
    values (auth.uid(), normalized_slug, normalized_name)
    returning *
    into resolved_tenant;
  end if;

  perform public.ensure_tenant_support_rows(resolved_tenant.id);
  return resolved_tenant;
end;
$$;

create or replace function public.finalize_signup_contact(
  contact_type text,
  primary_contact_input text
)
returns public.site_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_tenant public.tenants;
  normalized_type text := lower(btrim(coalesce(contact_type, '')));
  normalized_contact text := public.normalize_phone_like_value(primary_contact_input);
  resolved_settings public.site_settings;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = auth.uid()
  ) then
    raise exception 'auth_user_missing';
  end if;

  if normalized_type not in ('whatsapp', 'phone') then
    raise exception 'invalid_contact_type';
  end if;

  if normalized_contact = '' or normalized_contact !~ '^\+?[0-9]{8,16}$' then
    raise exception 'invalid_primary_contact';
  end if;

  select *
  into resolved_tenant
  from public.tenants
  where owner_user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'tenant_required';
  end if;

  perform public.ensure_tenant_support_rows(resolved_tenant.id);

  update public.site_settings
  set
    phone_number = case when normalized_type = 'phone' then normalized_contact else phone_number end,
    whatsapp_url = case when normalized_type = 'whatsapp' then normalized_contact else whatsapp_url end,
    orders_enabled = true
  where tenant_id = resolved_tenant.id
  returning *
  into resolved_settings;

  return resolved_settings;
end;
$$;

create or replace function public.get_storefront(store_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant public.tenants;
  target_settings jsonb := '{}'::jsonb;
  target_categories jsonb := '[]'::jsonb;
  target_products jsonb := '[]'::jsonb;
begin
  select *
  into target_tenant
  from public.tenants
  where lower(slug) = lower(coalesce(store_slug, ''))
  limit 1;

  if not found then
    raise exception 'store_not_found';
  end if;

  perform public.ensure_tenant_support_rows(target_tenant.id);

  select coalesce(to_jsonb(site_settings_row) - 'tenant_id', '{}'::jsonb)
  into target_settings
  from (
    select *
    from public.site_settings
    where tenant_id = target_tenant.id
    limit 1
  ) as site_settings_row;

  select coalesce(
    jsonb_agg(to_jsonb(category_row) - 'tenant_id' order by category_row.order_index asc, category_row.created_at asc),
    '[]'::jsonb
  )
  into target_categories
  from (
    select *
    from public.categories
    where tenant_id = target_tenant.id
    order by order_index asc, created_at asc
  ) as category_row;

  select coalesce(
    jsonb_agg(to_jsonb(product_row) - 'tenant_id' order by product_row.created_at desc),
    '[]'::jsonb
  )
  into target_products
  from (
    select *
    from public.products
    where tenant_id = target_tenant.id
      and is_available = true
    order by created_at desc
  ) as product_row;

  return jsonb_build_object(
    'tenant',
    jsonb_build_object(
      'id', target_tenant.id,
      'slug', target_tenant.slug,
      'store_name', target_tenant.store_name
    ),
    'site_settings',
    target_settings,
    'categories',
    target_categories,
    'products',
    target_products
  );
end;
$$;

create or replace function public.create_order(
  store_slug text,
  target_product_id uuid,
  customer_name_input text,
  customer_phone_input text,
  order_quantity integer
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant public.tenants;
  source_product public.products%rowtype;
  created_order public.orders;
  normalized_customer_name text := regexp_replace(trim(coalesce(customer_name_input, '')), '\s+', ' ', 'g');
  normalized_customer_phone text := public.normalize_phone_like_value(customer_phone_input);
  normalized_quantity integer := coalesce(order_quantity, 0);
begin
  select *
  into target_tenant
  from public.tenants
  where lower(slug) = lower(coalesce(store_slug, ''))
  limit 1;

  if not found then
    raise exception 'store_not_found';
  end if;

  if not exists (
    select 1
    from public.site_settings
    where tenant_id = target_tenant.id
      and coalesce(orders_enabled, false) = true
  ) then
    raise exception 'orders_disabled';
  end if;

  if normalized_customer_name = '' then
    raise exception 'customer_name_required';
  end if;

  if char_length(normalized_customer_name) < 2 or char_length(normalized_customer_name) > 120 then
    raise exception 'invalid_customer_name';
  end if;

  if normalized_customer_phone = '' then
    raise exception 'customer_phone_required';
  end if;

  if normalized_customer_phone !~ '^\+?[0-9]{8,16}$' then
    raise exception 'invalid_customer_phone';
  end if;

  if normalized_quantity < 1 then
    raise exception 'invalid_quantity';
  end if;

  select *
  into source_product
  from public.products
  where tenant_id = target_tenant.id
    and id = target_product_id
    and is_available = true
  limit 1;

  if not found then
    raise exception 'product_not_available';
  end if;

  insert into public.orders (
    tenant_id,
    product_id,
    product_name,
    product_price,
    product_category,
    customer_name,
    customer_phone,
    quantity
  )
  values (
    target_tenant.id,
    source_product.id,
    source_product.name,
    source_product.price,
    source_product.category,
    normalized_customer_name,
    normalized_customer_phone,
    normalized_quantity
  )
  returning *
  into created_order;

  return created_order;
end;
$$;

create or replace function public.track_product_click(
  store_slug text,
  target_product_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  next_click_count bigint;
begin
  select id
  into target_tenant_id
  from public.tenants
  where lower(slug) = lower(coalesce(store_slug, ''))
  limit 1;

  if target_tenant_id is null then
    raise exception 'store_not_found';
  end if;

  update public.products
  set click_count = coalesce(click_count, 0) + 1
  where tenant_id = target_tenant_id
    and id = target_product_id
  returning click_count
  into next_click_count;

  return coalesce(next_click_count, 0);
end;
$$;

create or replace function public.track_site_visit(store_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  next_total_visits bigint;
begin
  select id
  into target_tenant_id
  from public.tenants
  where lower(slug) = lower(coalesce(store_slug, ''))
  limit 1;

  if target_tenant_id is null then
    raise exception 'store_not_found';
  end if;

  perform public.ensure_tenant_support_rows(target_tenant_id);

  update public.site_stats
  set total_visits = coalesce(total_visits, 0) + 1
  where tenant_id = target_tenant_id
  returning total_visits
  into next_total_visits;

  return coalesce(next_total_visits, 0);
end;
$$;

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_site_stats_updated_at on public.site_stats;
create trigger set_site_stats_updated_at
before update on public.site_stats
for each row
execute function public.set_updated_at();

