import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}
