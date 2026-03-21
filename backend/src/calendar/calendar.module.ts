import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CalendarCryptoService } from './calendar-crypto.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [ConfigModule, AuthModule, DatabaseModule],
  controllers: [CalendarController],
  providers: [CalendarCryptoService, CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
