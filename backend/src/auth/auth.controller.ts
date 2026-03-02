import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service';
import {
  LoginBodySchema,
  LogoutBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
  UpdateVerificationBodySchema,
} from './auth.types';

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('/register')
  async register(@Body() body: unknown, @Req() request: FastifyRequest) {
    const parsed = this.parseOrThrow(RegisterBodySchema, body);
    const result = await this.authService.register(
      parsed,
      request.ip ?? null,
      request.headers['user-agent'] ?? null,
    );
    return { data: result };
  }

  @Post('/login')
  async login(@Body() body: unknown, @Req() request: FastifyRequest) {
    const parsed = this.parseOrThrow(LoginBodySchema, body);
    const result = await this.authService.login(
      parsed,
      request.ip ?? null,
      request.headers['user-agent'] ?? null,
    );
    return { data: result };
  }

  @Post('/refresh')
  async refresh(@Body() body: unknown, @Req() request: FastifyRequest) {
    const parsed = this.parseOrThrow(RefreshBodySchema, body);
    const result = await this.authService.refresh(
      parsed.refreshToken,
      request.ip ?? null,
      request.headers['user-agent'] ?? null,
    );
    return { data: result };
  }

  @Post('/logout')
  async logout(@Body() body: unknown) {
    const parsed = this.parseOrThrow(LogoutBodySchema, body);
    const result = await this.authService.logout(parsed.refreshToken);
    return { data: result };
  }

  @Get('/me')
  async me(@Req() request: FastifyRequest) {
    const accessToken = this.getBearerToken(request);
    const user = await this.authService.getCurrentUser(accessToken);
    return { data: user };
  }

  @Get('/me/verification')
  async myVerification(@Req() request: FastifyRequest) {
    const accessToken = this.getBearerToken(request);
    const verification = await this.authService.getCurrentUserVerification(accessToken);
    return { data: verification };
  }

  @Patch('/users/:id/verification')
  async updateVerification(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsedId = this.parseOrThrow(z.uuid(), id);
    const parsedBody = this.parseOrThrow(UpdateVerificationBodySchema, body);
    const accessToken = this.getBearerToken(request);
    const user = await this.authService.updateUserVerification(
      accessToken,
      parsedId,
      parsedBody,
    );
    return { data: user };
  }
}
