import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const migrationName = '0001_vendrome_schema.sql';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function run(): Promise<void> {
  const schemaPath = resolve(__dirname, '../../db/vendrome_schema.sql');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSql = readFileSync(schemaPath, 'utf8').trim();
  if (!schemaSql) {
    throw new Error('Schema file is empty.');
  }

  const checksum = sha256(schemaSql);
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://vendrome:vendrome@localhost:5433/vendrome';
  const client = new Client({ connectionString });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const existing = await client.query<{
      name: string;
      checksum: string;
    }>(
      `SELECT name, checksum FROM schema_migrations WHERE name = $1 LIMIT 1`,
      [migrationName],
    );

    if (existing.rowCount && existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(
          `Migration ${migrationName} already applied with a different checksum.`,
        );
      }
      console.log(`Migration ${migrationName} already applied.`);
      return;
    }

    await client.query(schemaSql);
    await client.query(
      `INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)`,
      [migrationName, checksum],
    );

    console.log(`Migration ${migrationName} applied successfully.`);
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration apply failed: ${message}`);
  process.exit(1);
});
