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
import { MessagesService } from './messages.service';
import {
  ConversationListQuerySchema,
  CreateMessageBodySchema,
  MessageListQuerySchema,
} from './messages.types';

@ApiTags('Messages')
@Controller('/conversations')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
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

  @Get()
  async getConversations(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(ConversationListQuerySchema, query);
    const data = await this.messagesService.getConversations(userId, parsedQuery);
    return { data };
  }

  @Get('/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Query() query: unknown,
  ) {
    const conversationId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(MessageListQuerySchema, query);
    const data = await this.messagesService.getMessages(
      userId,
      conversationId,
      parsedQuery,
    );
    return { data };
  }

  @Post('/:id/messages')
  async createMessage(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const conversationId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateMessageBodySchema, body);
    const data = await this.messagesService.createMessage(
      userId,
      conversationId,
      parsedBody,
    );
    return { data };
  }

  @Post('/:id/read')
  async markRead(@Param('id') id: string, @Req() request: FastifyRequest) {
    const conversationId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.messagesService.markConversationRead(
      userId,
      conversationId,
    );
    return { data };
  }
}
