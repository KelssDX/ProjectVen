import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { ProfilesService } from './profiles.service';
import {
  ProfileListQuerySchema,
  ProfileSuggestionQuerySchema,
  SimilarProfilesQuerySchema,
  TrendingProfilesQuerySchema,
  UpsertMyProfileBodySchema,
} from './profiles.types';

@ApiTags('Profiles')
@Controller('/profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
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

  private async getOptionalUserId(request: FastifyRequest): Promise<string | null> {
    if (!request.headers.authorization) {
      return null;
    }

    const accessToken = this.getBearerToken(request);
    const user = await this.authService.getCurrentUser(accessToken);
    return user.id;
  }

  @Get()
  async getProfiles(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(ProfileListQuerySchema, query);
    const data = await this.profilesService.getProfiles(parsedQuery);
    return { data };
  }

  @Get('/suggestions')
  async getSuggestions(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(ProfileSuggestionQuerySchema, query);
    const data = await this.profilesService.getSuggestions(
      parsedQuery.query,
      parsedQuery.limit,
    );
    return { data };
  }

  @Get('/trending')
  async getTrending(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(TrendingProfilesQuerySchema, query);
    const data = await this.profilesService.getTrending(parsedQuery.limit);
    return { data };
  }

  @Put('/me')
  async upsertMyProfile(@Req() request: FastifyRequest, @Body() body: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(UpsertMyProfileBodySchema, body);
    const data = await this.profilesService.upsertMyProfile(userId, parsedBody);
    return { data };
  }

  @Get('/:id/similar')
  async getSimilarProfiles(
    @Param('id') id: string,
    @Query() query: unknown,
    @Req() request: FastifyRequest,
  ) {
    const profileId = this.parseOrThrow(z.uuid(), id);
    const parsedQuery = this.parseOrThrow(SimilarProfilesQuerySchema, query);
    const viewerUserId = await this.getOptionalUserId(request);
    const data = await this.profilesService.getSimilarProfiles(
      profileId,
      viewerUserId,
      parsedQuery.limit,
    );
    return { data };
  }

  @Post('/:id/views')
  async incrementViews(@Param('id') id: string) {
    const profileId = this.parseOrThrow(z.uuid(), id);
    const data = await this.profilesService.incrementProfileViews(profileId);
    return { data };
  }

  @Get('/:id')
  async getProfile(@Param('id') id: string, @Req() request: FastifyRequest) {
    const profileId = this.parseOrThrow(z.uuid(), id);
    const viewerUserId = await this.getOptionalUserId(request);
    const data = await this.profilesService.getProfile(profileId, viewerUserId);
    return { data };
  }
}
