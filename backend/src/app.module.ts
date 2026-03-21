import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConnectionsModule } from './connections/connections.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { InvestmentsModule } from './investments/investments.module';
import { MarketingModule } from './marketing/marketing.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { MessagesModule } from './messages/messages.module';
import { PostsModule } from './posts/posts.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    CalendarModule,
    ConnectionsModule,
    RealtimeModule,
    MessagesModule,
    InvestmentsModule,
    MarketingModule,
    MarketplaceModule,
    MentorshipModule,
    PostsModule,
    ProfilesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
