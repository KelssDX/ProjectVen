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
import { MentorshipService } from './mentorship.service';
import {
  CreateMentorshipOfferBodySchema,
  MentorshipMentorListQuerySchema,
  MentorshipRequestListQuerySchema,
  UpdateMentorshipStatusBodySchema,
} from './mentorship.types';

@ApiTags('Mentorship')
@Controller('/mentorship')
export class MentorshipController {
  constructor(
    private readonly mentorshipService: MentorshipService,
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

  @Get('/mentors')
  async getMentors(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(MentorshipMentorListQuerySchema, query);
    const data = await this.mentorshipService.getMentors(parsedQuery);
    return { data };
  }

  @Get('/requests')
  async getRequests(@Query() query: unknown) {
    const parsedQuery = this.parseOrThrow(MentorshipRequestListQuerySchema, query);
    const data = await this.mentorshipService.getRequests(parsedQuery);
    return { data };
  }

  @Get('/mine')
  async getMine(@Req() request: FastifyRequest) {
    const userId = await this.getRequiredUserId(request);
    const data = await this.mentorshipService.getMine(userId);
    return { data };
  }

  @Post('/posts/:id/offers')
  async createOffer(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMentorshipOfferBodySchema, body);
    const data = await this.mentorshipService.createOffer(userId, postId, parsedBody);
    return { data };
  }

  @Post('/relationships/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const relationshipId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(UpdateMentorshipStatusBodySchema, body);
    const data = await this.mentorshipService.updateStatus(
      userId,
      relationshipId,
      parsedBody,
    );
    return { data };
  }
}
