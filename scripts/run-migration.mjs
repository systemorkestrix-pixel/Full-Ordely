import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'Missing SUPABASE_DB_URL (or DATABASE_URL). Add your Supabase Postgres connection string to .env before running a migration.',
  );
  process.exit(1);
}

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Missing migration path. Example: npm run migrate:site-settings');
  process.exit(1);
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const migrationPath = path.resolve(projectRoot, migrationName);

async function loadMigrationSql(targetPath) {
  const migrationStat = await fs.stat(targetPath);

  if (migrationStat.isFile()) {
    return fs.readFile(targetPath, 'utf8');
  }

  const migrationFiles = (await fs.readdir(targetPath))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((firstFile, secondFile) => firstFile.localeCompare(secondFile));

  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) => fs.readFile(path.join(targetPath, fileName), 'utf8')),
  );

  return migrationParts.join('\n\n');
}

const migrationSql = await loadMigrationSql(migrationPath);

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  await client.connect();
  await client.query(migrationSql);
  console.log(`Migration applied successfully: ${migrationName}`);
}

main()
  .catch((error) => {
    console.error(`Migration failed: ${migrationName}`);
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
