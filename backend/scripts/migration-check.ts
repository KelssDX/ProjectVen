import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const schemaPath = resolve(__dirname, '../../db/vendrome_schema.sql');
  assertCondition(existsSync(schemaPath), `Schema file not found: ${schemaPath}`);

  const sql = readFileSync(schemaPath, 'utf8').trim();
  assertCondition(sql.length > 0, 'Schema file is empty.');
  assertCondition(sql.includes('BEGIN;'), 'Schema file must include BEGIN;');
  assertCondition(sql.includes('COMMIT;'), 'Schema file must include COMMIT;');

  console.log('Migration check passed.');
}

try {
  run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration check failed: ${message}`);
  process.exit(1);
}
