import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'vendrome-backend',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
    };
  }
}
