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
import { InvestmentsService } from './investments.service';
import {
  CreateInvestmentCommitmentBodySchema,
  InvestmentCampaignListQuerySchema,
  InvestmentCommitmentListQuerySchema,
} from './investments.types';

@ApiTags('Investments')
@Controller('/investments')
export class InvestmentsController {
  constructor(
    private readonly investmentsService: InvestmentsService,
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
  async getCampaigns(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(InvestmentCampaignListQuerySchema, query);
    const data = await this.investmentsService.getCampaigns(parsedQuery);
    return { data };
  }

  @Get('/posts/:id/commitments')
  async getCommitments(@Param('id') id: string, @Query() query: unknown) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const parsedQuery = this.parseOrThrow(InvestmentCommitmentListQuerySchema, query);
    const data = await this.investmentsService.getCommitments(postId, parsedQuery.limit);
    return { data };
  }

  @Post('/posts/:id/commitments')
  async createCommitment(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateInvestmentCommitmentBodySchema, body);
    const data = await this.investmentsService.createCommitment(
      userId,
      postId,
      parsedBody,
    );
    return { data };
  }
}
