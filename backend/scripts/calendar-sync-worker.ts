import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CalendarModule } from '../src/calendar/calendar.module';
import { CalendarService } from '../src/calendar/calendar.service';
import { DatabaseModule } from '../src/database/database.module';

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isSyncEnabled(): boolean {
  return process.env.CALENDAR_SYNC_ENABLED === 'true';
}

function shouldWatch(): boolean {
  return process.argv.includes('--watch') || process.env.CALENDAR_SYNC_CONTINUOUS === 'true';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    CalendarModule,
  ],
})
class CalendarSyncWorkerModule {}

async function runBatch(calendarService: CalendarService): Promise<void> {
  const batchSize = getNumberEnv('CALENDAR_SYNC_BATCH_SIZE', 10);
  const result = await calendarService.runScheduledSyncBatch(batchSize);
  console.log(
    `[calendar-sync-worker] processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed}`,
  );
}

async function bootstrap(): Promise<void> {
  if (!isSyncEnabled()) {
    console.log('[calendar-sync-worker] CALENDAR_SYNC_ENABLED is false; exiting.');
    return;
  }

  const app = await NestFactory.createApplicationContext(
    CalendarSyncWorkerModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  const calendarService = app.get(CalendarService);

  try {
    await runBatch(calendarService);

    if (!shouldWatch()) {
      return;
    }

    const pollIntervalMs = getNumberEnv('CALENDAR_SYNC_POLL_INTERVAL_MS', 30_000);
    while (true) {
      await sleep(pollIntervalMs);
      await runBatch(calendarService);
    }
  } finally {
    await app.close();
  }
}

void bootstrap();
