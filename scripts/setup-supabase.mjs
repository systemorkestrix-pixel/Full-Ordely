import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'Missing SUPABASE_DB_URL (or DATABASE_URL). Add your Supabase Postgres connection string to .env before running npm run setup:db.',
  );
  process.exit(1);
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const migrationPath = path.resolve(projectRoot, 'migrations/20260425_site_settings');

const requiredTables = [
  'tenants',
  'categories',
  'products',
  'site_settings',
  'orders',
  'site_stats',
  'data_access_logs',
];
const requiredColumnsByTable = {
  tenants: ['id', 'owner_user_id', 'slug', 'store_name', 'created_at', 'updated_at', 'created_by'],
  categories: ['id', 'tenant_id', 'name', 'icon', 'order_index', 'created_at', 'updated_at', 'created_by'],
  products: ['id', 'tenant_id', 'name', 'price', 'category', 'is_available', 'click_count', 'image_url', 'created_at', 'updated_at', 'created_by'],
  site_settings: ['id', 'tenant_id', 'hero_image_url', 'phone_number', 'google_maps_url', 'whatsapp_url', 'messenger_url', 'telegram_url', 'facebook_url', 'instagram_url', 'tiktok_url', 'orders_enabled', 'service_country', 'service_region', 'created_at', 'updated_at', 'created_by'],
  orders: ['id', 'tenant_id', 'product_id', 'product_name', 'product_price', 'product_category', 'customer_name', 'customer_phone', 'quantity', 'status', 'created_at', 'updated_at', 'created_by'],
  site_stats: ['id', 'tenant_id', 'total_visits', 'created_at', 'updated_at', 'created_by'],
  data_access_logs: ['id', 'action', 'table_name', 'record_id', 'user_id', 'tenant_id', 'metadata', 'created_at'],
};

const requiredFunctions = [
  'slugify',
  'email_exists',
  'validate_tenant_identity_conflicts',
  'current_tenant_id',
  'ensure_tenant_support_rows',
  'provision_tenant_context',
  'initialize_signup_tenant',
  'finalize_signup_contact',
  'get_storefront',
  'create_order',
  'track_product_click',
  'track_site_visit',
  'set_created_by',
  'audit_data_change',
];
const requiredStorageBuckets = ['images'];

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

function getDbConnectionHint() {
  try {
    const parsedUrl = new URL(databaseUrl);
    const host = parsedUrl.hostname;
    const port = parsedUrl.port || '(default)';
    const username = parsedUrl.username || '(missing)';
    const poolerHint = host.includes('pooler.supabase.com')
      ? 'You are using a Supabase pooler host. Confirm the port and password exactly as shown in Supabase.'
      : 'Confirm the host, port, username, and database password from Supabase.';

    return `Connection target: host=${host}, port=${port}, user=${username}. ${poolerHint}`;
  } catch {
    return 'Confirm SUPABASE_DB_URL exactly matches the connection string from Supabase.';
  }
}

async function loadMigrationSql() {
  const migrationStat = await fs.stat(migrationPath);

  if (migrationStat.isFile()) {
    return fs.readFile(migrationPath, 'utf8');
  }

  const migrationFiles = (await fs.readdir(migrationPath))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((firstFile, secondFile) => firstFile.localeCompare(secondFile));

  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) => fs.readFile(path.join(migrationPath, fileName), 'utf8')),
  );

  return migrationParts.join('\n\n');
}

async function reloadPostgrestSchemaCache() {
  await client.query(`select pg_notify('pgrst', 'reload schema')`);
}

async function ensureStorageBucket() {
  await client.query(`
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
  `);

  await client.query(`
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
  `);
}

async function verifySchema() {
  const { rows: tableRows } = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [requiredTables],
  );

  const { rows: functionRows } = await client.query(
    `
      select proname
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and proname = any($1::text[])
    `,
    [requiredFunctions],
  );

  const { rows: columnRows } = await client.query(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [Object.keys(requiredColumnsByTable)],
  );

  const { rows: bucketRows } = await client.query(
    `
      select id
      from storage.buckets
      where id = any($1::text[])
    `,
    [requiredStorageBuckets],
  );

  const existingTables = new Set(tableRows.map((row) => row.table_name));
  const existingFunctions = new Set(functionRows.map((row) => row.proname));
  const existingBuckets = new Set(bucketRows.map((row) => row.id));
  const existingColumnsByTable = new Map();

  columnRows.forEach((row) => {
    const currentColumns = existingColumnsByTable.get(row.table_name) || new Set();
    currentColumns.add(row.column_name);
    existingColumnsByTable.set(row.table_name, currentColumns);
  });

  const missingTables = requiredTables.filter((name) => !existingTables.has(name));
  const missingFunctions = requiredFunctions.filter((name) => !existingFunctions.has(name));
  const missingBuckets = requiredStorageBuckets.filter((name) => !existingBuckets.has(name));
  const missingColumns = [];

  Object.entries(requiredColumnsByTable).forEach(([tableName, columns]) => {
    const existingColumns = existingColumnsByTable.get(tableName) || new Set();
    columns.forEach((columnName) => {
      if (!existingColumns.has(columnName)) {
        missingColumns.push(`public.${tableName}.${columnName}`);
      }
    });
  });

  if (missingTables.length > 0 || missingFunctions.length > 0 || missingColumns.length > 0 || missingBuckets.length > 0) {
    const issues = [];

    if (missingTables.length > 0) {
      issues.push(`Missing tables: ${missingTables.join(', ')}`);
    }

    if (missingFunctions.length > 0) {
      issues.push(`Missing functions: ${missingFunctions.join(', ')}`);
    }

    if (missingColumns.length > 0) {
      issues.push(`Missing columns: ${missingColumns.join(', ')}`);
    }

    if (missingBuckets.length > 0) {
      issues.push(`Missing storage buckets: ${missingBuckets.join(', ')}`);
    }

    throw new Error(`Supabase schema verification failed. ${issues.join(' | ')}`);
  }
}

async function main() {
  const migrationSql = await loadMigrationSql();

  await client.connect();
  await client.query(migrationSql);
  await ensureStorageBucket();
  await reloadPostgrestSchemaCache();
  await verifySchema();
  console.log('Supabase bootstrap completed.');
}

main()
  .catch((error) => {
    console.error('Supabase bootstrap failed.');
    console.error(error.message || error);
    if (String(error?.message || '').toLowerCase().includes('password authentication failed')) {
      console.error(getDbConnectionHint());
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
