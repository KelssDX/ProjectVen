import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { CalendarProviderSchema } from '../contracts/calendar';
import { CalendarService } from './calendar.service';
import {
  BeginCalendarOauthBodySchema,
  CalendarEventListQuerySchema,
  CompleteCalendarOauthBodySchema,
  ConnectCalendarIntegrationBodySchema,
  CreateCalendarEventBodySchema,
  UpdateCalendarEventBodySchema,
} from './calendar.types';

@ApiTags('Calendar')
@Controller('/calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
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

  @Get('/events')
  async getEvents(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(CalendarEventListQuerySchema, query);
    const data = await this.calendarService.getEvents(userId, parsedQuery);
    return { data };
  }

  @Post('/events')
  async createEvent(@Req() request: FastifyRequest, @Body() body: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CreateCalendarEventBodySchema, body);
    const data = await this.calendarService.createEvent(userId, parsedBody);
    return { data };
  }

  @Patch('/events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const eventId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(UpdateCalendarEventBodySchema, body);
    const data = await this.calendarService.updateEvent(userId, eventId, parsedBody);
    return { data };
  }

  @Delete('/events/:id')
  async deleteEvent(@Param('id') id: string, @Req() request: FastifyRequest) {
    const eventId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.calendarService.deleteEvent(userId, eventId);
    return { data };
  }

  @Get('/integrations')
  async getIntegrations(@Req() request: FastifyRequest) {
    const userId = await this.getRequiredUserId(request);
    const data = await this.calendarService.getIntegrations(userId);
    return { data };
  }

  @Post('/integrations/:provider/connect')
  async connectIntegration(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const parsedProvider = this.parseOrThrow(CalendarProviderSchema, provider);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(
      ConnectCalendarIntegrationBodySchema,
      body,
    );
    const data = await this.calendarService.connectIntegration(
      userId,
      parsedProvider,
      parsedBody,
    );
    return { data };
  }

  @Post('/integrations/:provider/oauth/start')
  async beginOauth(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const parsedProvider = this.parseOrThrow(CalendarProviderSchema, provider);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(BeginCalendarOauthBodySchema, body);
    const data = await this.calendarService.beginOauth(
      userId,
      parsedProvider,
      parsedBody,
    );
    return { data };
  }

  @Post('/integrations/:provider/oauth/complete')
  async completeOauth(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const parsedProvider = this.parseOrThrow(CalendarProviderSchema, provider);
    const userId = await this.getRequiredUserId(request);
    const parsedBody = this.parseOrThrow(CompleteCalendarOauthBodySchema, body);
    const data = await this.calendarService.completeOauth(
      userId,
      parsedProvider,
      parsedBody,
    );
    return { data };
  }

  @Post('/integrations/:provider/disconnect')
  async disconnectIntegration(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
  ) {
    const parsedProvider = this.parseOrThrow(CalendarProviderSchema, provider);
    const userId = await this.getRequiredUserId(request);
    const data = await this.calendarService.disconnectIntegration(
      userId,
      parsedProvider,
    );
    return { data };
  }

  @Post('/integrations/:provider/sync')
  async syncIntegration(
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
  ) {
    const parsedProvider = this.parseOrThrow(CalendarProviderSchema, provider);
    const userId = await this.getRequiredUserId(request);
    const data = await this.calendarService.syncIntegration(
      userId,
      parsedProvider,
      { reason: 'manual' },
    );
    return { data };
  }

  @Post('/webhooks/google')
  async googleWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const data = await this.calendarService.handleGoogleWebhook(headers);
    return { data };
  }

  @Post('/webhooks/microsoft')
  async microsoftWebhook(
    @Query('validationToken') validationToken: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (validationToken) {
      reply.type('text/plain');
      return validationToken;
    }

    const data = await this.calendarService.handleMicrosoftWebhook(body);
    return { data };
  }
}
