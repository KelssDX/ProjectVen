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
import { ConnectionsService } from './connections.service';
import {
  ConnectionListQuerySchema,
  CreateConnectionRequestBodySchema,
  TopicListQuerySchema,
} from './connections.types';

@ApiTags('Connections')
@Controller('/connections')
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
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

  @Get('/mine')
  async getMine(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsed = this.parseOrThrow(ConnectionListQuerySchema, query);
    const data = await this.connectionsService.getMine(userId, parsed.search);
    return { data };
  }

  @Post('/requests')
  async requestConnection(@Req() request: FastifyRequest, @Body() body: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateConnectionRequestBodySchema, body);
    const data = await this.connectionsService.requestConnection(userId, parsedBody);
    return { data };
  }

  @Post('/:id/accept')
  async acceptConnection(@Req() request: FastifyRequest, @Param('id') id: string) {
    const userId = await this.getRequiredUserId(request);
    const connectionId = this.parseOrThrow(z.uuid(), id);
    const data = await this.connectionsService.acceptConnection(userId, connectionId);
    return { data };
  }

  @Post('/:id/reject')
  async rejectConnection(@Req() request: FastifyRequest, @Param('id') id: string) {
    const userId = await this.getRequiredUserId(request);
    const connectionId = this.parseOrThrow(z.uuid(), id);
    const data = await this.connectionsService.rejectConnection(userId, connectionId);
    return { data };
  }

  @Post('/follows/:userId/toggle')
  async toggleFollow(@Req() request: FastifyRequest, @Param('userId') targetUserId: string) {
    const userId = await this.getRequiredUserId(request);
    const parsedTargetUserId = this.parseOrThrow(z.uuid(), targetUserId);
    const data = await this.connectionsService.toggleFollow(userId, parsedTargetUserId);
    return { data };
  }

  @Get('/topics')
  async getTopics(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(TopicListQuerySchema, query);
    const data = await this.connectionsService.getTopics(userId, parsedQuery);
    return { data };
  }

  @Post('/topics/:id/toggle')
  async toggleTopicFollow(@Req() request: FastifyRequest, @Param('id') id: string) {
    const userId = await this.getRequiredUserId(request);
    const topicId = this.parseOrThrow(z.uuid(), id);
    const data = await this.connectionsService.toggleTopicFollow(userId, topicId);
    return { data };
  }
}
