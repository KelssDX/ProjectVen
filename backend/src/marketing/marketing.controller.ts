import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { MarketingService } from './marketing.service';
import {
  CreateMarketingCampaignBodySchema,
  IngestMarketingCampaignMetricsBodySchema,
  MarketingCampaignListQuerySchema,
  UpdateMarketingCampaignStatusBodySchema,
} from './marketing.types';

@ApiTags('Marketing')
@Controller('/marketing')
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly authService: AuthService,
  ) {}

  private parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown): T {
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: z.treeifyError(result.error),
        },
      });
    }

    return result.data;
  }

  private getBearerToken(request: FastifyRequest): string {
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException({
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required.',
        },
      });
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_AUTHORIZATION_FORMAT',
          message: 'Authorization header must be Bearer <token>.',
        },
      });
    }

    return token;
  }

  private async getRequiredUserId(request: FastifyRequest): Promise<string> {
    const accessToken = this.getBearerToken(request);
    const user = await this.authService.getCurrentUser(accessToken);
    return user.id;
  }

  @Get('/campaigns')
  async getCampaigns(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(MarketingCampaignListQuerySchema, query);
    const data = await this.marketingService.getCampaigns(userId, parsedQuery);
    return { data };
  }

  @Post('/campaigns')
  async createCampaign(
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMarketingCampaignBodySchema, body);
    const data = await this.marketingService.createCampaign(userId, parsedBody);
    return { data };
  }

  @Post('/campaigns/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const campaignId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(UpdateMarketingCampaignStatusBodySchema, body);
    const data = await this.marketingService.updateStatus(
      userId,
      campaignId,
      parsedBody,
    );
    return { data };
  }

  @Get('/campaigns/:id/metrics')
  async getMetrics(@Param('id') id: string, @Req() request: FastifyRequest) {
    const campaignId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.marketingService.getMetrics(userId, campaignId);
    return { data };
  }

  @Post('/campaigns/:id/metrics')
  async ingestMetrics(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const campaignId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(IngestMarketingCampaignMetricsBodySchema, body);
    const data = await this.marketingService.ingestMetrics(
      userId,
      campaignId,
      parsedBody,
    );
    return { data };
  }
}
