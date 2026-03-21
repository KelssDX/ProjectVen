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
import { MarketplaceService } from './marketplace.service';
import {
  CreateMarketplaceBookingBodySchema,
  CreateMarketplaceOrderBodySchema,
  CreateMarketplaceReviewBodySchema,
  MarketplaceListQuerySchema,
  MarketplaceReviewListQuerySchema,
} from './marketplace.types';

@ApiTags('Marketplace')
@Controller('/marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
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

  @Get('/products')
  async getProducts(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(MarketplaceListQuerySchema, query);
    const data = await this.marketplaceService.getProducts(parsedQuery);
    return { data };
  }

  @Get('/services')
  async getServices(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(MarketplaceListQuerySchema, query);
    const data = await this.marketplaceService.getServices(parsedQuery);
    return { data };
  }

  @Get('/posts/:id/reviews')
  async getReviews(@Param('id') id: string, @Query() query: unknown) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const parsedQuery = this.parseOrThrow(MarketplaceReviewListQuerySchema, query);
    const data = await this.marketplaceService.getReviews(postId, parsedQuery.limit);
    return { data };
  }

  @Post('/posts/:id/reviews')
  async createReview(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMarketplaceReviewBodySchema, body);
    const data = await this.marketplaceService.createOrUpdateReview(
      userId,
      postId,
      parsedBody,
    );
    return { data };
  }

  @Post('/products/:id/orders')
  async createOrder(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMarketplaceOrderBodySchema, body);
    const data = await this.marketplaceService.createOrder(userId, postId, parsedBody);
    return { data };
  }

  @Post('/services/:id/bookings')
  async createBooking(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMarketplaceBookingBodySchema, body);
    const data = await this.marketplaceService.createBooking(userId, postId, parsedBody);
    return { data };
  }
}
