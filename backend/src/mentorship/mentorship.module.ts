import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MentorshipController } from './mentorship.controller';
import { MentorshipService } from './mentorship.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MentorshipController],
  providers: [MentorshipService],
})
export class MentorshipModule {}
