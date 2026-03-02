import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(): void {
  const contractsReadme = resolve(__dirname, '../src/contracts/README.md');
  if (!existsSync(contractsReadme)) {
    throw new Error(
      'Contracts directory is missing. Add backend/src/contracts and schemas before merge.',
    );
  }

  console.log('Contracts check passed.');
}

try {
  run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Contracts check failed: ${message}`);
  process.exit(1);
}
