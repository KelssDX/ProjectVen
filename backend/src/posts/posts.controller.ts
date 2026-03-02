import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { PostsService } from './posts.service';
import {
  BookmarkListQuerySchema,
  CreateCommentBodySchema,
  CreatePostBodySchema,
  FeedQuerySchema,
  ToggleReactionBodySchema,
} from './posts.types';

@ApiTags('Posts')
@Controller('/posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
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
    const authorization = request.headers.authorization;
    if (!authorization) {
      return null;
    }

    const accessToken = this.getBearerToken(request);
    const user = await this.authService.getCurrentUser(accessToken);
    return user.id;
  }

  @Get()
  async getFeed(@Query() query: unknown, @Req() request: FastifyRequest) {
    const parsed = this.parseOrThrow(FeedQuerySchema, query);
    const viewerUserId = await this.getOptionalUserId(request);
    const data = await this.postsService.getFeed({
      viewerUserId,
      cursor: parsed.cursor,
      limit: parsed.limit,
      type: parsed.type,
    });
    return { data };
  }

  @Post()
  async createPost(@Body() body: unknown, @Req() request: FastifyRequest) {
    const parsedBody = this.parseOrThrow(CreatePostBodySchema, body);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.createPost(userId, parsedBody);
    return { data };
  }

  @Post('/:id/reactions')
  async toggleReaction(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const parsedBody = this.parseOrThrow(ToggleReactionBodySchema, body);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.toggleReaction(userId, postId, parsedBody);
    return { data };
  }

  @Post('/:id/bookmarks')
  async toggleBookmark(@Param('id') id: string, @Req() request: FastifyRequest) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.toggleBookmark(userId, postId);
    return { data };
  }

  @Post('/:id/shares')
  async toggleShare(@Param('id') id: string, @Req() request: FastifyRequest) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.toggleShare(userId, postId);
    return { data };
  }

  @Post('/:id/reposts')
  async toggleRepost(@Param('id') id: string, @Req() request: FastifyRequest) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.toggleRepost(userId, postId);
    return { data };
  }

  @Get('/bookmarks')
  async getBookmarks(@Req() request: FastifyRequest, @Query() query: unknown) {
    const userId = await this.getRequiredUserId(request);
    const parsedQuery = this.parseOrThrow(BookmarkListQuerySchema, query);
    const data = await this.postsService.getBookmarks(userId, parsedQuery);
    return { data };
  }

  @Delete('/bookmarks/:id')
  async deleteBookmark(@Req() request: FastifyRequest, @Param('id') id: string) {
    const userId = await this.getRequiredUserId(request);
    const bookmarkId = this.parseOrThrow(z.uuid(), id);
    const data = await this.postsService.deleteBookmark(userId, bookmarkId);
    return { data };
  }

  @Get('/:id/comments')
  async getComments(@Param('id') id: string, @Query('limit') limit?: string) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const parsedLimit = this.parseOrThrow(
      z.coerce.number().int().min(1).max(100).default(50),
      limit ?? 50,
    );
    const data = await this.postsService.getComments(postId, parsedLimit);
    return { data };
  }

  @Post('/:id/comments')
  async createComment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    const postId = this.parseOrThrow(z.uuid(), id);
    const parsedBody = this.parseOrThrow(CreateCommentBodySchema, body);
    const userId = await this.getRequiredUserId(request);
    const data = await this.postsService.createComment(userId, postId, parsedBody);
    return { data };
  }
}
