import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

const requiredPublicEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const isVercelBuild = process.env.VERCEL === '1';
const skipSchemaCheck = process.env.SKIP_SUPABASE_SCHEMA_CHECK === '1';
const strictSchemaCheck = ['1', 'true', 'yes'].includes(
  String(process.env.STRICT_SUPABASE_BUILD || '').toLowerCase(),
);
const requiredTables = [
  'public.tenants',
  'public.categories',
  'public.products',
  'public.site_settings',
  'public.orders',
  'public.site_stats',
  'public.data_access_logs',
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

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runBootstrap() {
  const result = spawnSync(process.execPath, ['./scripts/setup-supabase.mjs'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.status !== 0) {
    fail('Supabase bootstrap failed. Build stopped.');
  }
}

async function getMissingSchemaArtifacts() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    const { rows: tableRows } = await client.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
      `,
      [requiredTables.map((value) => value.replace('public.', ''))],
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

    const existingTables = new Set(tableRows.map((row) => `public.${row.table_name}`));
    const existingFunctions = new Set(functionRows.map((row) => row.proname));
    const existingBuckets = new Set(bucketRows.map((row) => row.id));
    const existingColumnsByTable = new Map();

    columnRows.forEach((row) => {
      const currentColumns = existingColumnsByTable.get(row.table_name) || new Set();
      currentColumns.add(row.column_name);
      existingColumnsByTable.set(row.table_name, currentColumns);
    });

    const missingColumns = [];
    const missingBuckets = requiredStorageBuckets.filter((bucketName) => !existingBuckets.has(bucketName));

    Object.entries(requiredColumnsByTable).forEach(([tableName, columns]) => {
      const existingColumns = existingColumnsByTable.get(tableName) || new Set();
      columns.forEach((columnName) => {
        if (!existingColumns.has(columnName)) {
          missingColumns.push(`public.${tableName}.${columnName}`);
        }
      });
    });

    return {
      missingTables: requiredTables.filter((tableName) => !existingTables.has(tableName)),
      missingFunctions: requiredFunctions.filter((functionName) => !existingFunctions.has(functionName)),
      missingColumns,
      missingBuckets,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const missingEnv = requiredPublicEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    fail(
      `Missing required environment variables for build: ${missingEnv.join(', ')}.`,
    );
  }

  if (skipSchemaCheck) {
    console.log('Skipping Supabase schema check because SKIP_SUPABASE_SCHEMA_CHECK=1.');
    return;
  }

  if (isVercelBuild && !strictSchemaCheck) {
    console.log('Skipping Supabase schema bootstrap on Vercel build. Public env is present and strict schema check is disabled.');
    return;
  }

  if (!databaseUrl) {
    fail('Missing SUPABASE_DB_URL (or DATABASE_URL). Build stopped before schema verification.');
  }

  console.log('Checking Supabase schema before build...');
  runBootstrap();

  const {
    missingTables,
    missingFunctions,
    missingColumns,
    missingBuckets,
  } = await getMissingSchemaArtifacts();

  if (
    missingTables.length > 0
    || missingFunctions.length > 0
    || missingColumns.length > 0
    || missingBuckets.length > 0
  ) {
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

    fail(`Supabase schema is still incomplete. ${issues.join(' | ')}.`);
  }

  console.log('Supabase schema is ready. Continuing build...');
}

main().catch((error) => {
  if (String(error?.message || '').toLowerCase().includes('password authentication failed')) {
    console.error(getDbConnectionHint());
  }
  fail(error?.message || 'Supabase readiness check failed.');
});
