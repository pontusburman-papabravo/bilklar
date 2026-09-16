import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { closePool, getPool } from "./pool.js";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface MigrationResult {
  applied: string[];
  stamped: string[];
  skipped: string[];
}

function defaultMigrationsDir(): string {
  if (config.migrationsDir) return config.migrationsDir;
  return join(__dirname, "../../../db/migrations");
}

export function listMigrationFiles(migrationsDir = defaultMigrationsDir()): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function ensureMigrationsTable(db: pg.Pool | pg.PoolClient): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedIds(db: pg.Pool | pg.PoolClient): Promise<Set<string>> {
  const result = await db.query(`SELECT id FROM schema_migrations`);
  return new Set(result.rows.map((row) => row.id as string));
}

async function schemaLooksInitialized(db: pg.Pool | pg.PoolClient): Promise<boolean> {
  const result = await db.query(`SELECT to_regclass('public.users') AS table_name`);
  return result.rows[0]?.table_name != null;
}

export async function applyMigrations(
  db: pg.Pool | pg.PoolClient = getPool(),
  migrationsDir = defaultMigrationsDir(),
): Promise<MigrationResult> {
  await ensureMigrationsTable(db);
  const applied = await appliedIds(db);
  const files = listMigrationFiles(migrationsDir);
  const result: MigrationResult = { applied: [], stamped: [], skipped: [] };
  const initialized = await schemaLooksInitialized(db);

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }

    if (initialized && file === "0001_initial.sql") {
      await db.query(
        `INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
        [file],
      );
      result.stamped.push(file);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await db.query(sql);
    await db.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
    result.applied.push(file);
  }

  return result;
}

async function main(): Promise<void> {
  const result = await applyMigrations();
  console.log(
    `Migrations: applied=${result.applied.length} stamped=${result.stamped.length} skipped=${result.skipped.length}`,
  );
  if (result.applied.length > 0) {
    console.log(`  applied: ${result.applied.join(", ")}`);
  }
  if (result.stamped.length > 0) {
    console.log(`  stamped (already present): ${result.stamped.join(", ")}`);
  }
  await closePool();
}

const isMain = process.argv[1]?.includes("migrate");
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
