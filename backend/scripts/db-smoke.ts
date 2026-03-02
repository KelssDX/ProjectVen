import { Client } from 'pg';

async function run(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://vendrome:vendrome@localhost:5433/vendrome';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query('SELECT 1 AS ok');
    const value = result.rows[0]?.ok;
    if (value !== 1) {
      throw new Error('Database smoke query returned an unexpected result.');
    }
    console.log('DB smoke check passed.');
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`DB smoke check failed: ${message}`);
  process.exit(1);
});
